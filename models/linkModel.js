const { Pool } = require('pg');

class LinkModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS links (
        code VARCHAR(8) PRIMARY KEY,
        target_url TEXT NOT NULL,
        total_clicks INTEGER DEFAULT 0,
        last_clicked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.pool.query(query);
  }
}

module.exports = LinkModel;

