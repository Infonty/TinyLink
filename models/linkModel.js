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

  async createLink(code, targetUrl) {
    const query = `
      INSERT INTO links (code, target_url)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await this.pool.query(query, [code, targetUrl]);
    return result.rows[0];
  }

  async getLinkByCode(code) {
    const query = 'SELECT * FROM links WHERE code = $1';
    const result = await this.pool.query(query, [code]);
    return result.rows[0];
  }

  async getAllLinks() {
    const query = 'SELECT * FROM links ORDER BY created_at DESC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async incrementClick(code) {
    const query = `
      UPDATE links
      SET total_clicks = total_clicks + 1,
          last_clicked_at = CURRENT_TIMESTAMP
      WHERE code = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [code]);
    return result.rows[0];
  }

  async deleteLink(code) {
    const query = 'DELETE FROM links WHERE code = $1 RETURNING *';
    const result = await this.pool.query(query, [code]);
    return result.rows[0];
  }
}

module.exports = LinkModel;

