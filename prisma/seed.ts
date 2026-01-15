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
  const hashedPassword = await bcrypt.hash('arinaadmin', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'arina@gmail.com',
      password: hashedPassword,
      name: 'Arina Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Администратор создан (email: arina@gmail.com, пароль: arinaadmin)');

  // Загрузка данных из JSON
  const jsonPath = path.join(process.cwd(), 'Аналитика контроля качества отдела продаж.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️  JSON файл не найден, пропускаем загрузку анкет');
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log('📋 Создание анкет из JSON...');

  // Map for renaming generic categories
  const categoryMapping: Record<string, string> = {
    'Аудит звонков 2ого касания': 'Качество звонка',
    'Аудит СРМ': 'Ведение сделки',
    'Аудит нереализованных сделок': 'Обоснованность закрытия',
    'Аудит переписок': 'Качество переписки',
    'Аудит заполнения внутренних отчетов': 'Качество отчета',
  };

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

    // --- Обработка Метаданных (Audit Input Data) ---
    let metadataOrder = 1;

    // 1. Приоритет: явный массив input_data
    if (sheet.input_data) {
      for (const field of sheet.input_data) {
        let fieldType = 'text';
        let options: string | null = null;
        let finalFieldName = field;

        const lowerField = field.toLowerCase();
        if (lowerField.includes('дата')) {
          fieldType = 'date';
        } else if (lowerField.includes('ссылка')) {
          fieldType = 'url';
        } else if (lowerField.includes('тип звонка')) {
          fieldType = 'radio';
          options = 'Входящий;Исходящий';
          finalFieldName = 'Тип звонка';
        }

        await prisma.questionnaireMetadataField.create({
          data: {
            versionId: version.id,
            fieldName: finalFieldName,
            fieldType: fieldType,
            options: options,
            isRequired: true,
            order: metadataOrder++,
          }
        });
      }
      console.log(`   📝 Созданы поля метаданных (из input_data): ${sheet.input_data.length}`);
    }
    // 2. Fallback: Специальная логика для "Аудит звонков 1ого касания" (Sheet 2), где метаданные в секции
    else if (sheet.sheet_index === 2 && sheet.sections && sheet.sections['Информация о сделке']) {
      const fields = sheet.sections['Информация о сделке'];
      for (const field of fields as string[]) {
        let fieldType = 'text';
        let options: string | null = null;
        let finalFieldName = field;

        const lowerField = field.toLowerCase();
        if (lowerField.includes('дата')) {
          fieldType = 'date';
        } else if (lowerField.includes('ссылка')) {
          fieldType = 'url';
        } else if (lowerField.includes('тип звонка')) {
          fieldType = 'radio';
          options = 'Входящий;Исходящий';
          finalFieldName = 'Тип звонка';
        }

        await prisma.questionnaireMetadataField.create({
          data: {
            versionId: version.id,
            fieldName: finalFieldName,
            fieldType: fieldType,
            options: options,
            isRequired: true,
            order: metadataOrder++,
          }
        });
      }
      console.log(`   📝 Созданы поля метаданных (из секции "Информация о сделке"): ${fields.length}`);
    }

    // --- Обработка Вопросов ---
    let questionOrder = 1;

    if (sheet.sections) {
      for (const [sectionName, items] of Object.entries(sheet.sections)) {
        // Пропускаем секцию, если она была использована как источник метаданных (только для Sheet 2)
        if (sheet.sheet_index === 2 && sectionName === 'Информация о сделке') {
          continue;
        }

        // Определяем имя категории
        let categoryName = sectionName;
        if (sectionName === 'придумать название категории') {
          categoryName = categoryMapping[sheet.sheet_name] || 'Общие вопросы';
        }

        for (const itemText of items as string[]) {
          await prisma.question.create({
            data: {
              versionId: version.id,
              text: itemText,
              category: categoryName,
              weight: 1.0,
              order: questionOrder++,
              isActive: true,
              hasSubitems: false,
            },
          });
        }
      }
    } else if (sheet.columns) {
      // Fallback для старых форматов без sections (на всякий случай)
      console.log('   ⚠️ Использован fallback для columns (не рекомендуется)');
    }

    console.log(`✅ Анкета "${questionnaire.name}" создана с ${questionOrder - 1} вопросами`);
  }

  console.log('\n🎉 База данных успешно заполнена!');
  console.log('\n📝 Данные для входа:');
  console.log('   Admin: arina@gmail.com / arinaadmin');
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
