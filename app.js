const express = require('express');
const { Client } = require('pg');
const path = require('path');
const electron = require('electron');
const { ipcMain, BrowserWindow } = electron;
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { agendar, obterAgendamentos, excluirAgendamento, configurarBanco, salvarConfiguracoesNoBanco, abrirConfiguracoesDoBanco, abrirJanelaDeHorariosAgendados, verificarAgendamentoExistente} = require('./src/functions/funcoes');
const fs = require('fs')

dotenv.config();
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'visual')));

//Abrir janela principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/visual/main.html'));
});

//Abrir dias agendados
app.get('/agendados', (req, res) => {
  // Implemente a lógica para obter os agendamentos e renderizar a página agendados.html
  // Exemplo: const agendamentos = obterAgendamentos();
  res.sendFile(path.join(__dirname, 'src/visual/agendados.html'));
});

//Abrir configurações do banco de dados
app.get('/configuracoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/visual/configuracoes.html'));
  });

  //ROTA PARA ENVIAR DADOS DO .ENV PARA CONFIGURACOES.HTML
app.get('/config', (req, res) => {
  res.json({
    user: process.env.USER,
    host: process.env.HOST,
    port: process.env.PORT,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  });
});




// Rota para abrir as configurações do banco de dados
app.post('/salvar-configuracoes', async (req, res) => {
    const { diaSemana, horario } = req.body;

    try {
        // Chama a função para salvar no banco de dados
        await salvarConfiguracoesNoBanco({diaSemana, horario});

        // Responde com sucesso
        res.status(200).json({ success: true, message: 'Configurações salvas com sucesso.' });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        // Responde com erro
        res.status(500).json({ success: false, message: 'Erro ao salvar configurações.' });
    }
});
  
  // Rota para abrir as configurações do banco de dados
  app.get('/abrir-configuracoes-banco', (req, res) => {
    abrirConfiguracoesDoBanco();
  
    res.sendFile(path.join(__dirname, 'src/visual/configuracoes.html'));
  });
  
  // Rota para abrir os horários agendados
  app.get('/abrir-outra-janela', (req, res) => {
    abrirJanelaDeHorariosAgendados();
  
    res.sendFile(path.join(__dirname, 'src/visual/agendados.html'));
  });



// Rota para salvar configurações no banco de dados
app.post('/salvar-configuracoes-banco', (req, res) => {
    try {
      // Caminho para o arquivo .env
      const envFilePath = path.join(__dirname, '.env');

      // Recuperar os dados do corpo da requisição
      const { user, password, host, port, database } = req.body;
  
      // Criar o conteúdo a ser salvo no arquivo .env
      const envContent = `USER=${user}\nPASSWORD=${password}\nHOST=${host}\nPORT=${port}\nDATABASE=${database}`;
  
      // Salvar o conteúdo no arquivo .env
      fs.writeFileSync(envFilePath, envContent, 'utf-8');
  
      // Responder ao cliente indicando sucesso
      res.json({ message: 'Configurações do banco de dados salvas com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar configurações no .env:', error);
      // Responder ao cliente indicando erro
      res.status(500).json({ error: 'Erro ao salvar configurações no .env' });
    }
  });

//rota para verificar agendamento
app.get('/verificar-agendamento/:dia', async (req, res) => {
    const dia = req.params.dia;

    try {
        const agendamentoExistente = await verificarAgendamentoExistente(dia);
        res.json(agendamentoExistente);
    } catch (error) {
        console.error('Erro ao verificar agendamento existente:', error);
        res.status(500).json({ error: 'Erro ao verificar agendamento existente.' });
    }
});

// Rota para excluir um agendamento
app.delete('/excluir-agendamento/:diaSemana', async (req, res) => {
    const { diaSemana } = req.params;

    const client = new Client({
        user: process.env.USER,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        port: process.env.PORT,
    });

    try {
        await client.connect();

        const query = 'DELETE FROM agendamentos WHERE dia = $1';
        const values = [diaSemana];

        await client.query(query, values);

        res.status(200).json({ message: 'Agendamento excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).json({ error: 'Erro interno ao excluir agendamento.' });
    } finally {
        await client.end();
    }
});


app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
