const express = require('express');
const path = require('path');
const electron = require('electron');
const { ipcMain, BrowserWindow } = electron;
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { agendar, obterAgendamentos, excluirAgendamento, configurarBanco, salvarConfiguracoesNoBanco, abrirConfiguracoesDoBanco, abrirJanelaDeHorariosAgendados} = require('./src/functions/funcoes');
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






//Agendar dia
app.post('/agendar', (req, res) => {
  res.redirect('/');
});
//Excluir dia
app.post('/excluir', (req, res) => {
  // Implemente a lógica para excluir um agendamento
  // Exemplo: excluirAgendamento(req.body.id);
  res.redirect('/agendados');
});

//Salvar configuracao do banco
app.post('/configurar-banco', (req, res) => {
  // Implemente a lógica para configurar o banco de dados
  // Exemplo: configurarBanco(req.body.host, req.body.usuario, req.body.senha, req.body.banco);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
