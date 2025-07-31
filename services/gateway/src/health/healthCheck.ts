import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { pool } from "../db/dbSetup";

export async function healthCheckPlugin(fastify: FastifyInstance) {
  // Liveness probe - simple check if service is running
  fastify.get("/live", async (request, reply) => {
    reply.send({
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe - check if service is ready to receive traffic
  fastify.get("/ready", async (request, reply) => {
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

      if (!hasVideosTable) {
        reply.code(503).send({
          status: "not ready",
          database: "connected",
          videosTable: "missing",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      reply.send({
        status: "ready",
        database: "connected",
        videosTable: "exists",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      reply.code(503).send({
        status: "not ready",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
