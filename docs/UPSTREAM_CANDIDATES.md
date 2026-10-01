# Upstream Candidates

Статус: `ACTIVE / EMPTY REGISTER`.

Этот реестр хранит только наблюдения о потенциально reusable улучшениях,
обнаруженных в проекте. Он не является backlog, вторым task store или
разрешением изменять другой repository.

## Lifecycle

1. Добавить candidate только с локальным evidence, затронутой reusable surface
   (`src/core/**` или `packages/**`) и причиной, почему решение не должно
   оставаться project-specific.
2. Указать статус `CANDIDATE | REJECTED | PROMOTED`, source task/PR и проверяемые
   acceptance criteria. Секреты, PII и machine-specific paths запрещены.
3. До отдельного owner decision candidate остаётся локальной записью и не
   меняет dependency direction, package API или другой repository.
4. `PROMOTED` допустим только после отдельного утверждённого workstream с
   собственными branch/PR/Gate. После принятия записать итоговый canonical SHA
   или удалить запись как перенесённую в профильный backlog.
5. `REJECTED` сохраняет краткую причину, чтобы предложение не возвращалось без
   новых данных.

## One-way contribution path

Client repository никогда автоматически не синхронизируется обратно в starter
и не push-ит в его branch. Project-owned brand, content, secrets, domains,
fixtures, migrations and client data upstream не переносятся.

1. В client task зафиксировать минимальный reusable defect/evidence и candidate
   только для `src/core/**`, `packages/**` или starter tooling.
2. Создать отдельный starter workstream от свежего canonical `main`: отдельные
   branch, worktree, Task Contract и SourceCraft PR.
3. Воспроизвести проблему на neutral fixture без client identity/PII/secrets;
   перенести минимальный platform fix и targeted regression test.
4. Провести full diff review и соответствующий exact-head SourceCraft Gate.
5. Только после merge записать canonical SHA как `PROMOTED`. Client получает
   исправление позже явным reviewable `starter:upgrade` из immutable tag+SHA;
   reverse/bidirectional
   sync, прямой cherry-pick client commit и автоматический merge запрещены.

STOP: нет neutral reproduction, ownership не platform/starter, candidate
содержит client данные, или предлагается обойти отдельный PR/Gate.

## Register

Активных candidates нет.

Preset v3, geo seed, registry lifecycle and bounded geo-catalog reads remain
project-owned implementations in this repository. Their inclusion in the clone
contract does not promote them to another repository or create an upstream
workstream.
