import { pool } from "./db";
import { logger } from "./logger";

const EMBEDDING_DIM = 768;

export async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info("Running database migrations...");

    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    logger.info("pgvector extension ensured");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assessment_plan TEXT NOT NULL DEFAULT '',
        units JSONB DEFAULT '[]',
        questions JSONB DEFAULT '[]',
        pdf_text TEXT DEFAULT '',
        filename TEXT DEFAULT '',
        teacher_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'draft',
        processing_stage TEXT DEFAULT '',
        processing_error TEXT,
        generation_status TEXT DEFAULT '',
        generation_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        chunk_count INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(${EMBEDDING_DIM}),
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS chunks_course_idx ON document_chunks (course_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS chunks_file_idx ON document_chunks (file_id);
    `);

    const colCheck = await client.query(`
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    `);
    if (colCheck.rows.length > 0 && colCheck.rows[0].udt_name !== 'vector') {
      logger.info({ udt: colCheck.rows[0].udt_name }, "Migrating document_chunks.embedding to vector...");
      await client.query(`
        ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(${EMBEDDING_DIM}) USING embedding::vector
      `);
      logger.info("document_chunks.embedding column migrated to vector type");
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS course_units (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        order_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending_review',
        teacher_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS course_questions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL REFERENCES course_units(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL DEFAULT '',
        chunk_ref TEXT,
        status TEXT NOT NULL DEFAULT 'pending_review',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL DEFAULT 2 REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL REFERENCES course_units(id) ON DELETE CASCADE,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        score INTEGER,
        total INTEGER,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL DEFAULT 2 REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL REFERENCES course_units(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        answers JSONB NOT NULL DEFAULT '[]',
        feedback TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tutor_conversations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL DEFAULT 2 REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tutor_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const existingUsers = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(existingUsers.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO users (name, email, role) VALUES
        ('Demo Teacher', 'teacher@demo.edu', 'teacher'),
        ('Demo Student', 'student@demo.edu', 'student');
      `);
      logger.info("Demo users created");
    }

    logger.info("Migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
