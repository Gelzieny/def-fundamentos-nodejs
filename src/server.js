const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('fast-csv');

const app = express();
app.use(bodyParser.json());

// Banco de dados em memória (substitua por um real)
let tasks = [];

// Middleware para validar ID
function validateTaskId(req, res, next) {
    const { id } = req.params;
    const task = tasks.find(t => t.id === id);
    if (!task) {
        return res.status(404).json({ error: 'Task não encontrada.' });
    }
    req.task = task;
    next();
}

// POST - Criar uma task
app.post('/tasks', (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title e Description são obrigatórios.' });
    }

    const newTask = {
        id: uuidv4(),
        title,
        description,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    tasks.push(newTask);
    return res.status(201).json(newTask);
});

// GET - Listar todas as tasks
app.get('/tasks', (req, res) => {
    const { title, description } = req.query;

    const filteredTasks = tasks.filter(task =>
        (!title || task.title.includes(title)) &&
        (!description || task.description.includes(description))
    );

    res.json(filteredTasks);
});

// PUT - Atualizar uma task
app.put('/tasks/:id', validateTaskId, (req, res) => {
    const { title, description } = req.body;

    if (!title && !description) {
        return res.status(400).json({ error: 'Title ou Description são obrigatórios.' });
    }

    const task = req.task;
    if (title) task.title = title;
    if (description) task.description = description;
    task.updated_at = new Date();

    res.json(task);
});

// DELETE - Remover uma task
app.delete('/tasks/:id', validateTaskId, (req, res) => {
    tasks = tasks.filter(task => task.id !== req.params.id);
    res.status(204).send();
});

// PATCH - Marcar como completa/incompleta
app.patch('/tasks/:id/complete', validateTaskId, (req, res) => {
    const task = req.task;
    task.completed_at = task.completed_at ? null : new Date();
    res.json(task);
});

// POST - Importar tasks em massa via CSV
app.post('/tasks/import', (req, res) => {
    const { path } = req.body; // Passe o caminho do arquivo CSV no corpo da requisição

    if (!path || !fs.existsSync(path)) {
        return res.status(400).json({ error: 'Arquivo CSV inválido ou não encontrado.' });
    }

    const tasksToAdd = [];

    fs.createReadStream(path)
        .pipe(csv.parse({ headers: true }))
        .on('data', row => {
            const { title, description } = row;
            if (title && description) {
                tasksToAdd.push({
                    id: uuidv4(),
                    title,
                    description,
                    completed_at: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                });
            }
        })
        .on('end', () => {
            tasks.push(...tasksToAdd);
            res.status(201).json({ message: `${tasksToAdd.length} tasks importadas.` });
        })
        .on('error', error => {
            res.status(500).json({ error: 'Erro ao processar o arquivo.' });
        });
});

// Inicializar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
