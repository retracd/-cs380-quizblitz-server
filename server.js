require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const questions = require('./data/questions')

const app = express()

// Middleware — must come before routes
app.use(cors())
app.use(express.json())

// In-memory scores store (replaced by MongoDB in Week 10)
let scores = []

// ── Routes ──────────────────────────────────────────────────────

// GET / — health check
app.get('/', (req, res) => {
  res.json({ message: 'QuizBlitz server is running' })
})

// GET /api/questions — returns all questions
app.get('/api/questions', (req, res) => {
  res.json(questions)
})

// GET /api/questions/random — returns 10 shuffled questions
app.get('/api/questions/random', (req, res) => {
  const RANDOM_QUESTIONS_COUNT = 10
  const shuffled = [...questions]  // copy — never mutate the original

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  res.json(shuffled.slice(0, RANDOM_QUESTIONS_COUNT))
})

// POST /api/scores — submit a score
app.post('/api/scores', (req, res) => {
  const { playerName, score, totalQuestions } = req.body

  if (!playerName || score === undefined || !totalQuestions) {
    return res.status(400).json({ error: 'playerName, score, and totalQuestions are required' })
  }

  const newScore = {
    id: Date.now(),
    playerName,
    score,
    totalQuestions,
    date: new Date().toISOString()
  }

  scores.push(newScore)
  console.log('Score received:', newScore)

  res.status(201).json(newScore)
})

// GET /api/scores — all scores, highest first
app.get('/api/scores', (req, res) => {
  const sorted = [...scores].sort((a, b) => b.score - a.score)
  res.json(sorted)
})

// ── Start ────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running at http://localhost:${process.env.PORT || 3000}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  })