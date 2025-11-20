const express = require('express');
const router = express.Router();
const LinkModel = require('../models/linkModel');
const LinkController = require('../controllers/linkController');

module.exports = (pool) => {
  const linkModel = new LinkModel(pool);
  const linkController = new LinkController(linkModel);

  router.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true, version: '1.0' });
  });

  router.get('/', async (req, res) => {
    try {
      const links = await linkModel.getAllLinks();
      const searchQuery = req.query.search || '';
      const filteredLinks = links.filter(link => 
        link.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.target_url && link.target_url.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      let linksTableHtml = '';
      if (filteredLinks.length === 0) {
        linksTableHtml = '<tr><td colspan="5" class="empty-state">No links found</td></tr>';
      } else {
        linksTableHtml = filteredLinks.map(link => {
          const targetUrl = link.target_url || '';
          const totalClicks = link.total_clicks || 0;
          const lastClickedAt = link.last_clicked_at;
          return `
          <tr>
            <td><a href="/code/${link.code}" class="code-link">${link.code}</a></td>
            <td class="url-cell"><span title="${targetUrl}">${targetUrl.length > 50 ? targetUrl.substring(0, 50) + '...' : targetUrl}</span></td>
            <td>${totalClicks}</td>
            <td>${lastClickedAt ? new Date(lastClickedAt).toLocaleString() : 'Never'}</td>
            <td>
              <button onclick="deleteLink('${link.code}')" class="btn btn-danger btn-sm">Delete</button>
            </td>
          </tr>
        `;
        }).join('');
      }

      const dashboardHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>TinyLink - URL Shortener</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <div class="container">
            <header>
              <h1>TinyLink</h1>
              <p class="subtitle">Shorten your URLs with ease</p>
            </header>

            <div class="add-link-section">
              <h2>Create New Link</h2>
              <form id="addLinkForm" onsubmit="handleAddLink(event)">
                <div class="form-group">
                  <label for="targetUrl">Target URL *</label>
                  <input type="url" id="targetUrl" name="targetUrl" required placeholder="https://example.com">
                </div>
                <div class="form-group">
                  <label for="customCode">Custom Code (optional)</label>
                  <input type="text" id="customCode" name="customCode" pattern="[A-Za-z0-9]{6,8}" placeholder="6-8 alphanumeric characters">
                  <small>Leave empty for auto-generated code</small>
                </div>
                <button type="submit" class="btn btn-primary" id="submitBtn">Create Link</button>
              </form>
              <div id="message" class="message"></div>
            </div>

            <div class="links-section">
              <div class="section-header">
                <h2>All Links</h2>
                <div class="search-box">
                  <input type="text" id="searchInput" placeholder="Search by code or URL..." value="${searchQuery}" onkeyup="handleSearch(event)">
                </div>
              </div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Short Code</th>
                      <th>Target URL</th>
                      <th>Total Clicks</th>
                      <th>Last Clicked</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${linksTableHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <script>
            async function handleAddLink(event) {
              event.preventDefault();
              const form = event.target;
              const submitBtn = document.getElementById('submitBtn');
              const messageDiv = document.getElementById('message');
              
              const targetUrl = document.getElementById('targetUrl').value;
              const customCode = document.getElementById('customCode').value;

              submitBtn.disabled = true;
              submitBtn.textContent = 'Creating...';
              messageDiv.textContent = '';
              messageDiv.className = 'message';

              try {
                const response = await fetch('/api/links', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ targetUrl, code: customCode || undefined })
                });

                const data = await response.json();

                if (response.ok) {
                  messageDiv.textContent = \`Link created! Code: \${data.code}\`;
                  messageDiv.className = 'message message-success';
                  form.reset();
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                } else {
                  messageDiv.textContent = data.error || 'Failed to create link';
                  messageDiv.className = 'message message-error';
                }
              } catch (error) {
                messageDiv.textContent = 'Error creating link';
                messageDiv.className = 'message message-error';
              } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Link';
              }
            }

            async function deleteLink(code) {
              if (!confirm(\`Are you sure you want to delete link "\${code}"?\`)) {
                return;
              }

              try {
                const response = await fetch(\`/api/links/\${code}\`, {
                  method: 'DELETE'
                });

                if (response.ok) {
                  window.location.reload();
                } else {
                  const data = await response.json();
                  alert(data.error || 'Failed to delete link');
                }
              } catch (error) {
                alert('Error deleting link');
              }
            }

            function handleSearch(event) {
              if (event.key === 'Enter') {
                const query = event.target.value;
                window.location.href = \`/?search=\${encodeURIComponent(query)}\`;
              }
            }
          </script>
        </body>
        </html>
      `;
      res.send(dashboardHtml);
    } catch (error) {
      console.error('Error loading dashboard:', error.message);
      res.status(500).send('Something went wrong while loading the page');
    }
  });

  router.get('/code/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const link = await linkModel.getLinkByCode(code);
      if (!link) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Not Found - TinyLink</title>
            <link rel="stylesheet" href="/styles.css">
          </head>
          <body>
            <div class="container">
              <h1>Link Not Found</h1>
              <p>The link with code "${code}" does not exist.</p>
              <a href="/">Back to Dashboard</a>
            </div>
          </body>
          </html>
        `);
      }

      const targetUrl = link.target_url || '';
      const totalClicks = link.total_clicks || 0;
      const lastClickedAt = link.last_clicked_at;
      const createdAt = link.created_at;

      const statsHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stats: ${code} - TinyLink</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <div class="container">
            <h1>Link Statistics</h1>
            <div class="stats-card">
              <div class="stat-item">
                <label>Short Code:</label>
                <span class="code-value">${link.code}</span>
              </div>
              <div class="stat-item">
                <label>Target URL:</label>
                <a href="${targetUrl}" target="_blank" class="url-link">${targetUrl}</a>
              </div>
              <div class="stat-item">
                <label>Total Clicks:</label>
                <span class="stat-value">${totalClicks}</span>
              </div>
              <div class="stat-item">
                <label>Last Clicked:</label>
                <span class="stat-value">${lastClickedAt ? new Date(lastClickedAt).toLocaleString() : 'Never'}</span>
              </div>
              <div class="stat-item">
                <label>Created:</label>
                <span class="stat-value">${createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            <div class="actions">
              <a href="/" class="btn btn-secondary">Back to Dashboard</a>
            </div>
          </div>
        </body>
        </html>
      `;
      res.send(statsHtml);
    } catch (error) {
      console.error('Error loading stats page:', error.message);
      res.status(500).send('Something went wrong while loading the stats');
    }
  });

  router.get('/:code', async (req, res) => {
    await linkController.redirect(req, res);
  });

  return router;
};

