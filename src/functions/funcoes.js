const { Client } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const moment = require('moment');
const execAsync = util.promisify(exec);
const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const schedule = require('node-schedule');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
};

async function realizarBackup() {
  const client = new Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT,
  });

  try {
    // Conectar ao PostgreSQL
    await client.connect();
    console.log('Conectado ao PostgreSQL');

    // Formatar a data atual usando moment.js
    const dataHoraAtual = moment().format('DD-MM-YY_HH-mm-ss');
    
    // Construir o caminho de backup com o nome do arquivo contendo a data e hora
    const caminhoBackup = `C:/Users/Fellipe Silva/OneDrive/Área de Trabalho/gerarbackup/backup_${dataHoraAtual}.sql`;

    const comandoBackup = `"C:/Program Files/PostgreSQL/15/bin/pg_dump.exe" -Ft --no-owner --dbname=postgresql://${client.user}:${client.password}@${client.host}:${client.port}/${client.database} > "${caminhoBackup}"`;

    // Executar o comando de backup
    const { stdout, stderr } = await execAsync(comandoBackup);

    // Verificar se houve erro
    if (stderr) {
      console.error(`Erro ao realizar o backup: ${stderr}`);
    } else {
      console.log(`Backup realizado com sucesso! Salvo em: ${caminhoBackup}`);
    }
  } catch (error) {
    console.error(`Erro durante a execução do backup: ${error.message}`);
  } finally {
    // Sempre desconectar, mesmo em caso de erro
    await client.end();
    console.log('Conexão encerrada');
  }
}

async function verificarAgendamentoExistente(dia) {
  const client = new Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT,
  });

  try {
    // Conectar ao PostgreSQL
    await client.connect();

    const query = 'SELECT * FROM agendamentos WHERE dia = $1 LIMIT 1';
    const values = [dia];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Erro ao verificar agendamento existente:', err);
    return null;
  } finally {
    await client.end();
  }
}

async function cancelarAgendamentoNoBanco(agendamentoId) {
  const client = new Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT,
  });

  try {
    // Conectar ao PostgreSQL
    await client.connect();

    const query = 'DELETE FROM agendamentos WHERE id = $1';
    const values = [agendamentoId];

    await client.query(query, values);
    console.log('Agendamento existente cancelado com sucesso.');
  } catch (err) {
    console.error('Erro ao cancelar agendamento existente:', err);
  } finally {
    await client.end();
  }
}

async function salvarConfiguracoesNoBanco(configuracoes) {
  try {
      const { diaSemana, horario } = configuracoes;

      // Verificar se diaSemana e horario estão definidos
      if (diaSemana && horario) {
          // Verificar se existe um agendamento para o mesmo dia da semana
          const agendamentoExistente = await verificarAgendamentoExistente(diaSemana);

          if (agendamentoExistente) {
              await cancelarAgendamentoNoBanco(agendamentoExistente.id);
          }

          // Salvar os dados no banco de dados
          await criarAgendamento({ diaSemana, horario });

          console.log('Configurações salvas no banco de dados:', configuracoes);
      } else {
          console.error('Dia da semana ou horário não definidos.');
      }
  } catch (error) {
      console.error('Erro ao salvar configurações no banco de dados:', error);
      throw error;
  }
}

async function abrirConfiguracoesDoBanco() {
  // Implemente a lógica para abrir as configurações do banco de dados
  // Use Electron para criar e exibir uma nova janela com a página de configurações do banco
  const configuracoesBancoWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  configuracoesBancoWindow.loadFile('src/visual/configuracoes.html');
}

async function abrirJanelaDeHorariosAgendados() {
  const horariosAgendadosWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  horariosAgendadosWindow.loadFile('src/visual/agendados.html');
}

async function criarAgendamento(configuracoes) {
    const { diaSemana, horario } = configuracoes;

    if (!diaSemana) {
      console.error('Dia da semana não definido.');
      return;
  }
    // Mapeia o nome do dia para o número correspondente (0 para domingo, 1 para segunda, etc.)
    const diaSemanaNumerico = {
        domingo: 0,
        segunda: 1,
        terca: 2,
        quarta: 3,
        quinta: 4,
        sexta: 5,
        sabado: 6,
    }[diaSemana.toLowerCase()];

    if (diaSemanaNumerico === undefined) {
        console.error('Dia da semana inválido:', diaSemana);
        return;
    }

    // Configura o agendamento
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = diaSemanaNumerico;
    rule.hour = parseInt(horario.split(':')[0], 10);
    rule.minute = parseInt(horario.split(':')[1], 10);

    // Cria um novo cliente para cada agendamento
    const novoClient = new Client(dbConfig);

    try {
        // Conectar ao banco de dados
        await novoClient.connect();

        // Verificar se existe um agendamento para o mesmo dia da semana
        const query = 'SELECT * FROM agendamentos WHERE dia = $1 LIMIT 1';
        const values = [diaSemana];

        const result = await novoClient.query(query, values);

        if (result.rows.length > 0) {
            await cancelarAgendamentoNoBanco(result.rows[0].id);
        }

        // Insere os dados no banco de dados
        const insertQuery = 'INSERT INTO agendamentos (dia, horario) VALUES ($1, $2)';
        const insertValues = [diaSemana, horario];

        await novoClient.query(insertQuery, insertValues);

        console.log('Dados inseridos no banco de dados com sucesso.');
        console.log('Agendador de backup configurado para:', diaSemana, horario);

        // Agenda a tarefa
        tarefaAgendada = schedule.scheduleJob(rule, () => {
            realizarBackup();
        });
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
    } finally {
        // Certifique-se de desconectar o cliente, mesmo se ocorrer um erro
        await novoClient.end();
    }
}

function excluirAgendamento() {
  var select = document.getElementById("agendado");
  var diaSelecionado = select.options[select.selectedIndex].value;

  fetch(`/excluir-agendamento/${diaSelecionado}`, {
      method: 'DELETE',
  })
  .then(response => response.json())
  .then(data => {
      console.log(data);
      // Aqui você pode lidar com a resposta do servidor, se necessário
  })
  .catch(error => {
      console.error('Erro ao excluir agendamento:', error);
  });
}


module.exports = {
  realizarBackup,
  verificarAgendamentoExistente,
  cancelarAgendamentoNoBanco,
  salvarConfiguracoesNoBanco,
  abrirConfiguracoesDoBanco,
  abrirJanelaDeHorariosAgendados,
  excluirAgendamento,
};
