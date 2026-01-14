import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начало заполнения базы данных...');

  // Создание дефолтной шкалы оценок
  console.log('📊 Создание шкалы оценок...');
  const defaultScale = await prisma.scoreScale.upsert({
    where: { id: 'default-scale' },
    update: {},
    create: {
      id: 'default-scale',
      name: 'Стандартная шкала',
      description: 'Шкала оценок: 1 / 0.5 / 0',
      isDefault: true,
      values: {
        create: [
          { value: 1, label: 'Выполнено полностью', order: 1 },
          { value: 0.5, label: 'Выполнено частично', order: 2 },
          { value: 0, label: 'Не выполнено', order: 3 },
        ],
      },
    },
  });

  console.log('✅ Шкала оценок создана');

  // Создание администратора
  console.log('👤 Создание администратора...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Администратор',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Администратор создан (email: admin@example.com, пароль: admin123)');

  // Загрузка данных из JSON
  const jsonPath = path.join(process.cwd(), 'Аналитика контроля качества отдела продаж.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️  JSON файл не найден, пропускаем загрузку анкет');
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log('📋 Создание анкет из JSON...');

  // Обрабатываем каждый лист (кроме "Вводных")
  for (const sheet of jsonData.sheets) {
    if (sheet.sheet_name === 'Вводные') {
      console.log(`⏭️  Пропускаем лист "${sheet.sheet_name}" (это вводные данные компании)`);
      continue;
    }

    console.log(`\n📄 Обработка листа: ${sheet.sheet_name}`);

    // Создаем анкету
    const questionnaire = await prisma.questionnaire.create({
      data: {
        name: sheet.checklist_title || sheet.sheet_name,
        description: sheet.description,
        type: sheet.sheet_name,
        isActive: true,
        scaleId: defaultScale.id,
      },
    });

    // Создаем первую версию анкеты
    const version = await prisma.questionnaireVersion.create({
      data: {
        questionnaireId: questionnaire.id,
        versionNumber: 1,
        isActive: true,
        changeNotes: 'Первоначальная версия',
      },
    });

    // Обновляем currentVersionId
    await prisma.questionnaire.update({
      where: { id: questionnaire.id },
      data: { currentVersionId: version.id },
    });

    // Создаем вопросы
    let questionOrder = 1;

    if (sheet.sections) {
      // Структура с секциями (например, "Аудит звонков 1ого касания")
      for (const [sectionName, items] of Object.entries(sheet.sections)) {
        if (sectionName === 'Информация о сделке') {
          // Это метаданные, не критерии оценки
          continue;
        }

        for (const itemText of items as string[]) {
          await prisma.question.create({
            data: {
              versionId: version.id,
              text: itemText,
              category: sectionName,
              weight: 1.0,
              order: questionOrder++,
              isActive: true,
              hasSubitems: false,
            },
          });
        }
      }
    } else if (sheet.columns) {
      // Структура с простым списком колонок
      let infoFieldsCount = 0;
      const infoFields = ['Дата аудита', 'Дата', 'Ссылка', 'Длительность', 'Менеджер', 'Статус', 'Тип'];

      for (const column of sheet.columns) {
        // Пропускаем информационные поля
        const isInfoField = infoFields.some(field => column.includes(field));
        if (isInfoField) {
          infoFieldsCount++;
          continue;
        }

        // Пропускаем итоговые колонки
        if (column === 'Балл' || column.includes('Что было хорошо') || column.includes('Плохо')) {
          continue;
        }

        await prisma.question.create({
          data: {
            versionId: version.id,
            text: column,
            weight: 1.0,
            order: questionOrder++,
            isActive: true,
            hasSubitems: false,
          },
        });
      }
    }

    console.log(`✅ Анкета "${questionnaire.name}" создана с ${questionOrder - 1} вопросами`);
  }

  console.log('\n🎉 База данных успешно заполнена!');
  console.log('\n📝 Данные для входа:');
  console.log('   Email: admin@example.com');
  console.log('   Пароль: admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Ошибка:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
