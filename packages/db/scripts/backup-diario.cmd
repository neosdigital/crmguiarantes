@echo off
rem Backup diario do CRM Guilherme Arantes — executado pelo Agendador de Tarefas do Windows
rem (tarefa "CRM Guilherme Arantes - Backup diario"). Ver packages/db/scripts/backup.ts.
cd /d "%~dp0..\..\.."
call npx tsx packages\db\scripts\backup.ts
