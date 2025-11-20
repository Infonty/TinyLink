const LinkModel = require('../models/linkModel');

function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

class LinkController {
  constructor(linkModel) {
    this.linkModel = linkModel;
  }

  async createLink(req, res) {
    try {
      const { targetUrl, code } = req.body;

      if (!targetUrl) {
        return res.status(400).json({ error: 'Please provide a target URL' });
      }

      if (!isValidUrl(targetUrl)) {
        return res.status(400).json({ error: 'The URL format is not valid' });
      }

      let finalCode = code;
      if (!finalCode) {
        let attempts = 0;
        do {
          const length = Math.floor(Math.random() * 3) + 6;
          finalCode = generateRandomCode(length);
          const existing = await this.linkModel.getLinkByCode(finalCode);
          if (!existing) break;
          attempts++;
          if (attempts > 10) {
            return res.status(500).json({ error: 'Having trouble creating a unique code. Please try again' });
          }
        } while (true);
      } else {
        if (!isValidCode(finalCode)) {
          return res.status(400).json({ error: 'Code must be between 6 and 8 characters, letters and numbers only' });
        }

        const existing = await this.linkModel.getLinkByCode(finalCode);
        if (existing) {
          return res.status(409).json({ error: 'This code is already taken. Please choose a different one' });
        }
      }

      const link = await this.linkModel.createLink(finalCode, targetUrl);
      res.status(201).json(link);
    } catch (error) {
      console.error('Error while creating link:', error.message);
      res.status(500).json({ error: 'Something went wrong while creating the link' });
    }
  }

  async getAllLinks(req, res) {
    try {
      const links = await this.linkModel.getAllLinks();
      res.json(links);
    } catch (error) {
      console.error('Error while fetching links:', error.message);
      res.status(500).json({ error: 'Could not retrieve links' });
    }
  }

  async getLinkByCode(req, res) {
    try {
      const { code } = req.params;
      const link = await this.linkModel.getLinkByCode(code);
      if (!link) {
        return res.status(404).json({ error: 'Link not found' });
      }
      res.json(link);
    } catch (error) {
      console.error('Error while fetching link:', error.message);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async deleteLink(req, res) {
    try {
      const { code } = req.params;
      const link = await this.linkModel.deleteLink(code);
      if (!link) {
        return res.status(404).json({ error: 'Link not found' });
      }
      res.json({ message: 'Link deleted successfully' });
    } catch (error) {
      console.error('Error while deleting link:', error.message);
      res.status(500).json({ error: 'Could not delete the link' });
    }
  }

  async redirect(req, res) {
    try {
      const { code } = req.params;
      const link = await this.linkModel.getLinkByCode(code);
      if (!link) {
        return res.status(404).send('Link not found');
      }

      await this.linkModel.incrementClick(code);
      res.redirect(302, link.target_url);
    } catch (error) {
      console.error('Error while redirecting:', error.message);
      res.status(500).send('Something went wrong');
    }
  }
}

module.exports = LinkController;

