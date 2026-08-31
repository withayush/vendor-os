import PDFDocument from "pdfkit";
import { query } from "../db/db.js";

// Generate Invoice PDF (Task T27)
export const generateInvoicePDF = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const businessId = req.businessId;

    // 1. Fetch Invoice Details
    const invoiceRes = await query(
      `SELECT i.*, b.business_name, b.business_phone, b.address_line, b.city 
       FROM invoices i
       JOIN businesses b ON i.business_id = b.id
       WHERE i.id = $1 AND i.business_id = $2 LIMIT 1`,
      [invoiceId, businessId]
    );

    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const invoice = invoiceRes.rows[0];

    // 2. Fetch Invoice Items
    const itemsRes = await query(
      `SELECT ii.*, p.name as product_name 
       FROM invoice_items ii
       JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    const items = itemsRes.rows;

    // 3. Initialize PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers for PDF download/view
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice-${invoice.invoice_number}.pdf`);

    doc.pipe(res);

    // --- PDF Styling & Layout ---
    // Business Header
    doc.fontSize(20).font('Helvetica-Bold').text(invoice.business_name, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text(`Phone: ${invoice.business_phone || 'N/A'}`, { align: 'left' });
    doc.text(`Address: ${invoice.address_line || ''}, ${invoice.city || ''}`, { align: 'left' });
    doc.moveDown();

    // Invoice Meta
    doc.fontSize(14).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
    doc.fontSize(10).font('Helvetica')
       .text(`Invoice No: ${invoice.invoice_number}`, { align: 'right' })
       .text(`Date: ${new Date(invoice.created_at).toLocaleString()}`, { align: 'right' })
       .text(`Payment Mode: ${invoice.payment_mode}`, { align: 'right' });

    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Customer Details
    doc.fontSize(11).font('Helvetica-Bold').text('Billed To:');
    doc.font('Helvetica')
       .text(`Name: ${invoice.customer_name}`)
       .text(`Phone: ${invoice.customer_phone || 'N/A'}`);

    doc.moveDown();

    // Table Headers
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Item Description', 50, tableTop);
    doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 360, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 440, tableTop, { width: 70, align: 'right' });

    doc.moveDown();
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Table Items
    let position = doc.y;
    doc.font('Helvetica').fontSize(10);

    items.forEach((item) => {
      doc.text(item.product_name, 50, position, { width: 230 });
      doc.text(item.quantity.toString(), 300, position, { width: 50, align: 'right' });
      doc.text(`₹${item.sold_price}`, 360, position, { width: 70, align: 'right' });
      doc.text(`₹${item.total_price}`, 440, position, { width: 70, align: 'right' });
      position += 20;
    });

    doc.moveDown(2);
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Grand Total
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Grand Total: ₹${invoice.grand_total}`, 350, doc.y, { align: 'right' });

    // Footer
    doc.fontSize(9).font('Helvetica-Oblique').text('Thank you for your business! Powered by VendorOS.', 50, 750, { align: 'center', width: 500 });

    doc.end();

  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    next(error);
  }
};
