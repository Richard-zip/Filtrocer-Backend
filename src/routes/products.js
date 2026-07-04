import { Router } from 'express';
import multer from 'multer';
import { dbConnect } from '../lib/db.js';
import Product from '../lib/models.js';
import { verifyAdminToken } from '../middleware/auth.js';
import { validateImage, MAX_IMAGE_SIZE } from '../lib/validate-image.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
});

router.get('/', async (req, res) => {
  try {
    await dbConnect();
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', verifyAdminToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    const imageFile = req.file;

    if (!name || !description || !price || !imageFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validation = validateImage(imageFile.buffer);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    await dbConnect();

    const imageBase64 = imageFile.buffer.toString('base64');
    const imageDataUrl = `data:${validation.mime};base64,${imageBase64}`;

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      image: imageDataUrl,
      imageData: imageFile.buffer,
    });

    await product.save();
    return res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/', verifyAdminToken, upload.single('image'), async (req, res) => {
  try {
    const { id, name, description, price } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    await dbConnect();

    const updateData = { name, description, price: parseFloat(price) };

    if (req.file) {
      const validation = validateImage(req.file.buffer);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      updateData.image = `data:${validation.mime};base64,${imageBase64}`;
      updateData.imageData = req.file.buffer;
    }

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    await dbConnect();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Keep multer errors (e.g. file too large) as clean JSON instead of falling
// through to Express's default HTML error page.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `La imagen no debe superar ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ error: 'Error al procesar el archivo' });
  }
  return next(err);
});

export default router;
