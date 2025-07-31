import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { pool } from "../db/dbSetup";

export async function healthCheckPlugin(fastify: FastifyInstance) {
  fastify.get("/health", async (request, reply) => {
    try {
      // Test basic database connection
      await pool.query("SELECT 1");

      // Test if videos table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'videos'
        );
      `);

      const hasVideosTable = tableCheck.rows[0].exists;

      reply.send({
        status: "ok",
        database: "connected",
        videosTable: hasVideosTable ? "exists" : "missing",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      reply.code(503).send({
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
