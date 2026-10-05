# @koslibs/builder

Единый CLI для React-приложений, ESM-библиотек, Storybook и тестов.
UI собирается через Rsbuild, библиотеки — через Rslib. Оба используют Rspack.
Storybook собирается через Vite.

## Подключение

Node.js >= 24.13.0. Builder устанавливается в devDependencies:

```sh
npm install --save-dev @koslibs/builder @koslibs/configs @types/react @types/react-dom @types/node
```

`@koslibs/configs` — обязательная peer-зависимость builder с диапазоном `^1.0.0`.
Builder использует версию configs, установленную в проекте.

Builder использует TypeScript 6.0.3. TypeScript 7 пока не используется: генератор
типов свойств Storybook зависит от API компилятора TypeScript 6.

В корне проекта создаётся `koslibs-builder.ts`:

```ts
import type { KoslibsBuilderConfig } from '@koslibs/builder';

const config: KoslibsBuilderConfig = {};

export default config;
```

Конфиг загружается встроенным TypeScript-загрузчиком Node.js. Типы импортируются через
`import type`, относительные импорты указываются с расширением файла, например `./settings.ts`.
В конфиге не поддерживаются `enum`, декораторы и другие конструкции, требующие преобразования в JavaScript.

Пустой объект использует дефолты builder. Отсутствующий файл также означает дефолты.
`init` не нужен. Builder создаёт служебные настройки в `.cache/koslibs-builder`,
не перезаписывая конфиг или scripts проекта. После изменения `koslibs-builder.ts`
следует перезапустить dev/watch-процесс.

Публичный тип контролируется пакетом:

```ts
interface KoslibsBuilderConfig {
    rsbuildConfig?: RsbuildConfig;
    clientConfig?: EnvironmentConfig;
    storybookViteConfig?: UserConfig;
    port?: number;
}
```

Типы Rsbuild экспортируются из `@koslibs/builder`, поэтому для импортов типов
не нужно отдельно устанавливать `@rsbuild/core`. Неизвестные поля верхнего уровня
игнорируются при загрузке; TypeScript подсказывает только поддерживаемые поля.
Некорректные значения известных полей, например `port: "8080"`, вызывают ошибку.

```ts
import type { KoslibsBuilderConfig } from '@koslibs/builder';

const config: KoslibsBuilderConfig = {
    port: 8080,
    rsbuildConfig: {
        source: { entry: { index: './src/main.tsx' } },
    },
    clientConfig: {
        html: { title: 'GullEye' },
        output: { distPath: { root: 'dist' } },
    },
};

export default config;
```

Настройки глубоко объединяются через `mergeRsbuildConfig`: дефолты → `rsbuildConfig`
→ клиентское окружение `clientConfig`. В UI это окружение называется `client`.
`port` имеет приоритет над `rsbuildConfig.server.port`, затем используется 8080.
Занятый порт вызывает ошибку вместо незаметного переключения на другой.
`clientConfig` используется только для UI. `rsbuildConfig` используется для UI и библиотек.
Для Storybook предназначен `storybookViteConfig`; настройки Rsbuild в Vite не переносятся.

## Scripts приложения

```json
{
    "start": "koslibs-builder ui:start",
    "build": "koslibs-builder ui:build",
    "preview": "koslibs-builder ui:preview",
    "typecheck": "koslibs-builder ui:typecheck",
    "test": "koslibs-builder ui:test",
    "test:watch": "koslibs-builder ui:test:watch",
    "test:coverage": "koslibs-builder ui:test:coverage",
    "test:e2e": "koslibs-builder ui:test:e2e",
    "test:screenshots": "koslibs-builder ui:test:screenshots",
    "storybook:start": "koslibs-builder storybook:start",
    "storybook:build": "koslibs-builder storybook:build"
}
```

Дефолты UI:

- Entry: `src/index.tsx`, затем существующий `src/main.tsx` или `src/index.ts`.
- React Fast Refresh в dev, production-оптимизации при build.
- CSS Modules для `*.module.css`; обычный CSS также поддерживается.
- Разделение vendor-кода и динамических импортов на чанки.
- Browserslist: `last 2 versions`. Это настройка преобразования синтаксиса; builder не добавляет полифиллы всех браузерных API.
- Выход в `dist`, относительные ссылки на ресурсы `./`, HTML с контейнером `#root`.

Rsbuild предоставляет дополнительные возможности через `rsbuildConfig` и `clientConfig`.
HTML можно изменить через `clientConfig.html`; для обычного сайта абсолютный путь к ресурсам
можно задать через `clientConfig.output.assetPrefix: '/'`.

Нужен `tsconfig.json`, расширяющий `@koslibs/configs`:

```json
{
    "extends": "@koslibs/configs/tsconfig",
    "compilerOptions": {
        "types": ["@koslibs/builder/client"],
        "esModuleInterop": true,
        "jsx": "react-jsx"
    },
    "include": ["src", "koslibs-builder.ts"]
}
```

`@koslibs/builder/client` предоставляет типы CSS Modules, ресурсов и `import.meta.env`.
Для TypeScript 6 нужно явно включить `esModuleInterop`: preset из `@koslibs/configs@1.0.0`
задаёт устаревшее значение `false`.
Для кода Node.js и конфигов, использующих `process`, добавь `@types/node` и `node` в `types`.
При использовании библиотек или JSX также нужны соответствующие `@types/*`.

Для работы с `examples/ui` в этом репозитории сначала выполни `npm run build`
из корня builder, затем в папке `examples/ui`:

```sh
npm install --no-save --package-lock=false ../..
npm run typecheck
```

Это подключит локальный builder, включая `@koslibs/builder/client`, без изменения
зависимостей в package.json примера.

`ui:build` сначала проверяет весь TS-проект и возвращает ненулевой код при ошибках.
`ui:start` запускает `tsc --noEmit --watch`, показывает ошибки в терминале,
продолжает работать и повторяет проверку после исправлений. Dev-server не прекращает
работу из-за исправимой ошибки типов. Проверку типов задаёт builder.
Фоновый checker завершается вместе с dev-server; его неожиданное завершение останавливает сервер.

## Библиотеки

Scripts используют префикс `lib` для build, typecheck и всех тестовых команд:

```json
{
    "start": "koslibs-builder lib:start",
    "watch": "koslibs-builder lib:watch",
    "build": "koslibs-builder lib:build",
    "typecheck": "koslibs-builder lib:typecheck",
    "test": "koslibs-builder lib:test",
    "test:watch": "koslibs-builder lib:test:watch",
    "test:coverage": "koslibs-builder lib:test:coverage",
    "test:e2e": "koslibs-builder lib:test:e2e",
    "test:screenshots": "koslibs-builder lib:test:screenshots",
    "storybook:start": "koslibs-builder storybook:start",
    "storybook:build": "koslibs-builder storybook:build"
}
```

`lib:start` — алиас `storybook:start` для компонентов. Для библиотеки без UI, например
API-клиента, script `start` можно направить на `koslibs-builder lib:watch`.
`lib:watch` пересобирает исходники и декларации при изменениях, проверяет типы в фоне
и продолжает следить за файлами после исправимой ошибки типов.

Дефолты: ESM-only, структура файлов из `src` сохраняется в `dist`, генерируются `.d.ts`.
Dependencies и peerDependencies остаются внешними. Тесты, spec-файлы и stories не входят в dist.
TypeScript проверяется перед build; ошибки деклараций тоже завершают сборку с ошибкой.
Для Node.js библиотеки задай `rsbuildConfig.output.target: 'node'`.

Служебный tsconfig для деклараций расширяет корневой tsconfig, ограничивает исходники
каталогом `src` и задаёт `rootDir: src`. Для другой структуры, специальных исключений
или project references укажи собственный `rsbuildConfig.source.tsconfigPath`.
В режиме сохранения модулей `source.entry` задаётся glob-паттернами, например
`{ index: ['./src/**', '!./src/**/*.test.*', '!./src/**/*.stories.*'] }`.

В package.json библиотеки указываются `"type": "module"`, `files` и exports:

```json
{
    "type": "module",
    "files": ["dist"],
    "exports": {
        ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
        "./feature": { "types": "./dist/feature.d.ts", "import": "./dist/feature.js" }
    }
}
```

Builder не изменяет exports автоматически. Линтинг и форматирование остаются командами
`koslibs-lint` из configs. Сам builder компилируется через tsc для начальной загрузки CLI.

`npm run lint` запускает общую проверку ESLint и Prettier через `koslibs-lint lint`.
`npm run lint:fix` исправляет ошибки линтинга и форматирование через `koslibs-lint lint:fix`.

## Storybook

Builder управляет Vite-framework, addon-docs, Controls, автодокументацией и stories
из `src/**/*.stories.{ts,tsx,js,jsx,mjs}`. `.storybook/main.ts` не требуется и не читается:
служебный main создаётся builder. При миграции старые addons и main-настройки нужно
сверить отдельно. Для локальных decorators и parameters используется `.storybook/preview.ts`.
Файлы `public` подключаются как статические ресурсы. Выход — `storybook-static`.

Блоки для собственных страниц Docs доступны через builder:

```tsx
import { Canvas, Controls, Title } from '@koslibs/builder/storybook/blocks';
```

Экспорт включает компоненты и типы `@storybook/addon-docs/blocks`. При миграции замените
импорты из `@storybook/addon-docs/blocks` на `@koslibs/builder/storybook/blocks`.
Если других прямых импортов `@storybook/addon-docs` нет, отдельную зависимость можно удалить:
builder управляет её версией и подключением addon в Storybook.

Storybook использует `port`. Перед production-сборкой запускается `tsc --noEmit`,
в dev — отдельный `tsc --noEmit --watch`. TypeScript 6 остаётся для извлечения типов
свойств компонентов в Docs/Controls.

Настройки Storybook задаются через `storybookViteConfig` в `koslibs-builder.ts`:

```ts
import type { KoslibsBuilderConfig } from '@koslibs/builder';

const config: KoslibsBuilderConfig = {
    storybookViteConfig: {
        define: { __API_URL__: JSON.stringify('https://api.example.test') },
    },
};

export default config;
```

Это типизированные настройки Vite. Корень проекта задаёт builder; локальные
`vite.config.*` не загружаются автоматически. CSS Modules и автоматический JSX runtime
поддерживаются без дополнительных настроек. Vite загружает `.env` проекта и публикует
переменные с префиксами `PUBLIC_` и `VITE_`. `rsbuildConfig`, `clientConfig` и плагины
Rspack не применяются к Storybook: определения, алиасы и другие специальные настройки
нужно перенести в соответствующие поля Vite. Неподдерживаемые поля builder-конфига,
включая `storybookConfig`, игнорируются; расширение API для addons возможно следующим шагом.

## Тесты

Только Rstest и Playwright. Компонентного браузерного runner нет.

- `test` запускает unit-тесты один раз, `test:watch` следит за изменениями.
- `test:coverage` создаёт отчёты text, HTML и lcov через Istanbul.
- Дефолтные unit-тесты: `src` и `tests`, имена `*.test.*` и `*.spec.*`.
- UI unit-тесты используют happy-dom и React preset configs; lib unit-тесты — Node.js.
- Без тестов команда завершается с ошибкой.
- Playwright E2E использует `playwright/**/*.spec.*`, исключая `*.screenshots.spec.*`.
- Screenshot-suite использует `playwright/**/*.screenshots.spec.*`.
- Playwright сам запускает UI dev-server, а для библиотеки — Storybook, на заданном порту.
- Скриншоты сравниваются через `expect(page).toHaveScreenshot()`. Обновление существующих
  эталонов — отдельное осознанное действие через `--update-snapshots`.

Для браузерных тестов нужен установленный Chromium соответствующей версии Playwright.
API тестов и типы stories доступны через builder, поэтому отдельные зависимости на
тестовые инструменты в проекте не обязательны:

```ts
// unit-тесты
import { test, expect } from '@koslibs/builder/rstest';
// Playwright-тесты (в другом файле)
import { test, expect } from '@koslibs/builder/playwright';
// типы stories
import type { Meta, StoryObj } from '@koslibs/builder/storybook';
```

Если используются прямые импорты `@playwright/test`, `@rstest/core` или
`@storybook/react-vite`, эти пакеты должны быть прямыми devDependencies проекта.
Builder сам разрешает исполняемые файлы своих инструментов и не полагается на глобальную установку.

Если проект имеет `rstest.config.*` или `playwright.config.*`, builder использует их.
В пользовательском Playwright-конфиге помечай screenshot-тесты тегом `@screenshots`:
builder выбирает E2E/screenshot-suite через grep. При таком конфиге запуск сервера
и остальные настройки контролирует сам проект. Общие фабрики доступны из
`@koslibs/builder/testing`, можно расширять их через обычные конфиги инструментов.
Тестовые и Storybook-флаги передаются дальше:

```sh
npm run test -- greeting
npm run test:e2e -- --list
npm run test:screenshots -- --update-snapshots
koslibs-builder ui:build --root ./frontend
```

## Переменные окружения

В UI загружаются `.env`, `.env.local`, `.env.development` / `.env.production` и их `.local` варианты.
Публичные переменные с префиксом `PUBLIC_` встраиваются в клиентскую сборку:

```dotenv
PUBLIC_API_URL=http://localhost:8081
```

```ts
const apiUrl = import.meta.env.PUBLIC_API_URL;
```

Это значения времени сборки. В production смена адреса требует пересборки.
Для runtime-настроек нужен отдельный механизм приложения. Секреты не должны иметь
префикс `PUBLIC_`: содержимое клиентского бандла доступно пользователям.
Для переиспользуемых библиотек builder не загружает `.env` автоматически.
Поведение описано в [документации Rsbuild](https://rsbuild.rs/guide/advanced/env-vars).

## Релиз самого builder

Релиз и Git hooks управляются `@koslibs/configs`. `npm install` / `npm ci` запускают
`prepare` и устанавливают общий Lefthook preset: проверки перед commit, Commitlint
и проверку Changeset перед push.

Перед отправкой изменений создайте один Changeset для PR:

```sh
npm run changeset
git add .changeset/*.md
git commit -m "feat: describe the change"
git push
```

Для следующих изменений в том же PR обновляйте существующий Changeset.
Проверка перед push требует, чтобы файл был добавлен и закоммичен; версия пакета
до релиза остаётся прежней. Для ручной проверки используется
`npm run changeset:check -- --base origin/main --head HEAD`.

В PR общий workflow запускает проверку `Changeset required`. После merge в `main`
workflow проверяет npm-пакет и через `koslibs-release` обновляет версию и `CHANGELOG.md`,
публикует пакет и отправляет релизный commit и Git tag. Повторный запуск доступен
через `workflow_dispatch`. Общие workflows закреплены на теге configs `v1.0.0`.

В настройках GitHub сделайте `Changeset required` обязательным для merge.
Для публикации используется существующий `NPM_TOKEN` либо npm Trusted Publishing,
настроенный для репозитория `koslibs/builder` и вызывающего workflow `release.yml`.

## Структура исходников

```text
src/
  index.ts             публичные типы builder
  cli/
    index.ts           точка входа CLI
    run.ts             маршрутизация команд
    args.ts            разбор аргументов
    commands.ts        список команд
    process.ts         запуск и завершение процессов
    handlers/          UI, библиотеки, Storybook, тесты, typecheck
  configs/             загрузка, валидация, дефолты и настройки инструментов
  typings/             интерфейсы, типы и клиентские декларации
  utils/               общие функции для пакетов и shell-команд
  storybook/           публичная точка входа @koslibs/builder/storybook
  testing/             публичные точки входа testing, rstest и playwright
```

Тесты повторяют структуру модулей в `tests/cli` и `tests/configs`.
Сборка очищает `dist`, чтобы удалённые или перенесённые модули не попадали в npm-архив.

Архитектурные источники: [Rsbuild](https://rsbuild.dev/guide/faq/general),
[Rslib: сохранение структуры модулей](https://www.rslib.rs/config/lib/bundle),
[Storybook Vite](https://storybook.js.org/docs/builders/vite).
