import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Очистка базы данных...');
  // Удаляем в порядке обратной зависимости
  await prisma.auditHistory.deleteMany();
  await prisma.auditAnswer.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.companyInputData.deleteMany();
  await prisma.companyQuestionnaire.deleteMany();
  await prisma.companyAnalyst.deleteMany();
  await prisma.questionSubitem.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionnaireMetadataField.deleteMany();
  await prisma.questionnaireVersion.deleteMany();
  await prisma.questionnaire.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.user.deleteMany(); // Удаляем пользователей, включая админа, чтобы пересоздать
  await prisma.company.deleteMany();
  await prisma.scoreScaleValue.deleteMany();
  await prisma.scoreScale.deleteMany();
  console.log('✅ База данных очищена');
}

async function main() {
  console.log('🌱 Начало заполнения базы данных...');

  await cleanDatabase();

  // Создание дефолтной шкалы оценок
  console.log('📊 Создание шкалы оценок...');
  const defaultScale = await prisma.scoreScale.create({
    data: {
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
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Администратор',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Администратор создан (email: admin@example.com, пароль: admin123)');

  // Создание тестовой компании и менеджеров
  console.log('🏢 Создание тестовой компании...');
  const company = await prisma.company.create({
    data: {
      name: 'Test Company',
      description: 'Тестовая компания для демонстрации',
      isActive: true,
      managers: {
        create: [
          { name: 'Иван Менеджер', isActive: true },
          { name: 'Петр Продажник', isActive: true },
        ],
      },
    },
  });
  console.log('✅ Тестовая компания "Test Company" создана с менеджерами');

  // Создание аналитика
  console.log('🕵️ Создание аналитика...');
  const analystPassword = await bcrypt.hash('analyst123', 10);
  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@example.com',
      password: analystPassword,
      name: 'Аналитик Тестовый',
      role: 'ANALYST',
      isActive: true,
    },
  });

  // Привязка аналитика к компании
  await prisma.companyAnalyst.create({
    data: {
      companyId: company.id,
      userId: analyst.id,
    },
  });

  console.log('✅ Аналитик создан (email: analyst@example.com, пароль: analyst123) и привязан к компании');

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
        companies: {
          create: {
            companyId: company.id,
            isEnabled: true,
          }
        }
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
          // Создаем поля метаданных из секции "Информация о сделке"
          let metadataOrder = 1;
          for (const itemText of items as string[]) {
            // Определяем тип поля (упрощенно)
            let fieldType = 'text';
            if (itemText.includes('Дата')) fieldType = 'date';

            await prisma.questionnaireMetadataField.create({
              data: {
                versionId: version.id,
                fieldName: itemText,
                fieldType: fieldType,
                isRequired: true,
                order: metadataOrder++,
              }
            });
          }
          console.log(`   📝 Созданы поля метаданных: ${(items as string[]).length}`);
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
      const infoFields = ['Дата аудита', 'Дата', 'Ссылка', 'Длительность', 'Менеджер', 'Статус', 'Тип', 'За какой день'];

      let metadataOrder = 1;

      for (const column of sheet.columns) {
        // Проверяем, является ли это информационным полем (метаданные)
        const isInfoField = infoFields.some(field => column.includes(field));

        if (isInfoField) {
          let fieldType = 'text';
          if (column.includes('Дата')) fieldType = 'date';

          await prisma.questionnaireMetadataField.create({
            data: {
              versionId: version.id,
              fieldName: column,
              fieldType: fieldType,
              isRequired: true,
              order: metadataOrder++,
            }
          });
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
      if (metadataOrder > 1) {
        console.log(`   📝 Созданы поля метаданных: ${metadataOrder - 1}`);
      }
    }

    console.log(`✅ Анкета "${questionnaire.name}" создана с ${questionOrder - 1} вопросами`);
  }

  console.log('\n🎉 База данных успешно заполнена!');
  console.log('\n📝 Данные для входа:');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   Analyst: analyst@example.com / analyst123');
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
