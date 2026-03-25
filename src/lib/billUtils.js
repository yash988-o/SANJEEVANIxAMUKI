import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';

const TELEGRAM_BOT_TOKEN = '8428503366:AAEAqIzabwoYW9l6WhYK-iZJd_bRbEiWKeM';
const TELEGRAM_CHAT_ID = '6522626890';

// Format the date to dd-mm-yyyy hh:mm a
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const pad = (n) => n.toString().padStart(2, '0');
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} (${pad(h)}:${m} ${ampm})`;
};

export const generateBillPDF = (transaction) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN NO. : 07ABPCS0259J1ZX', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', 105, 15, { align: 'center' });
  doc.text('Original Copy', 196, 15, { align: 'right' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SANJEEVANI CLINIC', 105, 25, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SHOP NO-23, VISHWADEEP BUILDING PLOT NO-4', 105, 30, { align: 'center' });
  doc.text('DISTRICT CENTER JANAKPURI Delhi-110058', 105, 34, { align: 'center' });
  doc.text('Telephone: 011-47015083, 9625026089', 105, 38, { align: 'center' });
  doc.text('Email-id: sanjeevani@gmail.com', 105, 42, { align: 'center' });
  
  // Draw Box around header
  doc.rect(10, 10, 190, 36);

  // Split details: Party info and Bill info with a 4mm gap from header
  const partyBoxY = 50; 
  doc.rect(10, partyBoxY, 190, 24);
  // vertical line in middle
  doc.line(125, partyBoxY, 125, partyBoxY + 24);
  
  // Party Info
  doc.setFont('helvetica', 'bold');
  doc.text(`Party : ${transaction.profiles?.name?.toUpperCase() || 'WALK-IN'}`, 12, partyBoxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mobile : ${transaction.profiles?.mobile || 'N/A'}`, 12, partyBoxY + 12);
  
  const age = transaction.profiles?.age || 'N/A';
  const gender = transaction.profiles?.gender || 'N/A';
  doc.text(`Age/Gender : ${age} / ${gender}`, 12, partyBoxY + 18);
  
  // Bill Details
  const billNo = Object.hasOwn(transaction, 'bill_no') ? transaction.bill_no : transaction.id.substring(0, 6).toUpperCase();
  doc.text(`Bill no.          : ${billNo}`, 128, partyBoxY + 6);
  doc.text(`Dated          : ${formatDate(transaction.transaction_at)}`, 128, partyBoxY + 12);

  // Description / Items Table (another 4mm gap)
  autoTable(doc, {
    startY: partyBoxY + 28,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 0, halign: 'center', fontSize: 8 },
    bodyStyles: { fontSize: 8, halign: 'center' },
    columnStyles: { 
      1: { halign: 'left' },
      6: { halign: 'right' }
    },
    head: [['S.N.', 'Description of Goods', 'HSN/SAC', 'Qty.', 'Unit.', 'Price', 'Amount(Rs.)']],
    body: [
      [
        '1',
        transaction.note || (transaction.type === 'receive' ? 'Deposit Amount' : 'Withdrawal Amount'),
        '-',
        '1.000',
        'Pcs.',
        Number(transaction.amount).toFixed(2),
        Number(transaction.amount).toFixed(2)
      ]
    ],
    didDrawPage: (data) => {
      // you can add footer here if needed
    }
  });

  const finalY = doc.lastAutoTable.finalY || 100;
  
  // Totals Box
  doc.rect(10, finalY, 190, 8);
  doc.setFont('helvetica', 'bold');
  doc.text('CURRENT BALANCE : 0.00', 12, finalY + 5);
  doc.text(`Grand Total        ${Number(transaction.amount).toFixed(2)}`, 190, finalY + 5, { align: 'right' });
  
  // Amount in words
  doc.rect(10, finalY + 8, 190, 10);
  doc.setFont('helvetica', 'normal');
  const amountStr = transaction.type === 'receive' ? 'Amount Received' : 'Amount Withdrawn';
  doc.text(`Rupees ${amountStr}: ${Number(transaction.amount).toFixed(2)} Only`, 12, finalY + 14);

  // Bank Details / T&C
  const termY = finalY + 18;
  doc.rect(10, termY, 190, 26);
  doc.setFontSize(7);
  doc.text('Terms & Conditions', 12, termY + 4);
  doc.text('1) Goods once sold will not be taken back / Replaced / Exchanged.', 12, termY + 8, { maxWidth: 65 });
  doc.text('2) Warranty cases in case of broken seal / burnt / physical damage will not be covered.', 12, termY + 15, { maxWidth: 65 });
  
  // Bank Info
  doc.line(80, termY, 80, termY + 26);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Detail :', 82, termY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank Name     : HDFC BANK', 82, termY + 8);
  doc.text('Branch Name   : MAIN BRANCH', 82, termY + 12);
  doc.text('A/c No.             : 5020000000', 82, termY + 16);
  doc.text('IFSC CODE     : HDFC0000001', 82, termY + 20);

  // Signature
  doc.line(140, termY, 140, termY + 26);
  doc.text('FOR SANJEEVANI CLINIC', 142, termY + 4);
  doc.text('Authorised Signatory', 142, termY + 24);

  return doc;
};

export const sendBillToTelegram = async (transaction) => {
  try {
    const doc = generateBillPDF(transaction);
    const pdfBlob = doc.output('blob');
    
    // Create File from Blob
    const file = new File([pdfBlob], `Bill_${transaction.profiles?.name || 'Customer'}_${transaction.id.substring(0,6)}.pdf`, {
      type: 'application/pdf',
    });

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', file);
    formData.append('caption', `🧾 New Bill Generated\n\nName: ${transaction.profiles?.name}\nMobile: ${transaction.profiles?.mobile}\nAmount: ₹${transaction.amount}\nDate: ${formatDate(transaction.transaction_at)}`);

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();
    if (!result.ok) {
      throw new Error(`Telegram Error: ${result.description}`);
    }

    // Mark transaction as bill_sent in supabase if we want to track it
    // Wait, let's create a bills table or add `bill_generated` column to transactions table?
    // Since we don't know if we can modify schema easily, we'll try to update `note` or if not possible, just trigger send.
    // The user asked to section "to show the generated bills", so we might need a `bills` table or use a field. 
    // We can check if we can add a column `bill_generated` (boolean) via an insert/query or assume it's just a view of transactions.
    
    return true;
  } catch (error) {
    console.error('Error sending bill:', error);
    throw error;
  }
};
