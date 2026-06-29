import assert from 'node:assert';
import test from 'node:test';

import {
  generatePartnershipStaffTemplate,
  generatePartnershipAckTemplate,
} from '../../src/app/utils/emailTemplates';
import type { PartnershipInquiryData } from '../../src/app/utils/emailService';

const baseData: PartnershipInquiryData = {
  inquiryType: 'wholesale',
  typeLabel: 'Wholesale',
  name: 'Ada Reader',
  email: 'ada@example.com',
  phone: '615-555-0100',
  organizationName: 'Diaspora Books',
  message: 'We need bulk African-American titles.',
  sourcePath: '/wholesale',
  details: {
    'Expected order volume': '100 books',
    'Product interests': 'books, apparel',
  },
  adminUrl: 'https://payload.alkebulanimages.com/admin/collections/partnership-inquiries/42',
};

test('staff template subject names the inquiry type and organization', () => {
  const tpl = generatePartnershipStaffTemplate(baseData);
  assert.ok(tpl.subject.includes('Wholesale'), `subject should include "Wholesale", got: "${tpl.subject}"`);
  assert.ok(tpl.subject.includes('Diaspora Books'), `subject should include org name, got: "${tpl.subject}"`);
});

test('staff template body includes a detail value', () => {
  const tpl = generatePartnershipStaffTemplate(baseData);
  assert.ok(tpl.html.includes('100 books'), 'html should include detail value "100 books"');
  assert.ok(tpl.text.includes('100 books'), 'text should include detail value "100 books"');
});

test('staff template includes adminUrl as a link', () => {
  const tpl = generatePartnershipStaffTemplate(baseData);
  assert.ok(
    tpl.html.includes('https://payload.alkebulanimages.com/admin/collections/partnership-inquiries/42'),
    'html should include the adminUrl',
  );
  assert.ok(
    tpl.text.includes('https://payload.alkebulanimages.com/admin/collections/partnership-inquiries/42'),
    'text should include the adminUrl',
  );
});

test('staff template omits adminUrl section when not provided', () => {
  const tpl = generatePartnershipStaffTemplate({ ...baseData, adminUrl: undefined });
  assert.ok(
    !tpl.html.includes('View Inquiry in Admin'),
    'html should not include admin link when adminUrl is absent',
  );
});

test('staff template returns non-empty text', () => {
  const tpl = generatePartnershipStaffTemplate(baseData);
  assert.ok(tpl.text.trim().length > 0, 'text should be non-empty');
});

test('ack template greets the inquirer by name', () => {
  const tpl = generatePartnershipAckTemplate(baseData);
  assert.ok(tpl.html.includes('Ada Reader'), `html should greet by name, got: "${tpl.html.slice(0, 200)}"`);
  assert.ok(tpl.text.includes('Ada Reader'), 'text should greet by name');
});

test('ack template restates the inquiry type label', () => {
  const tpl = generatePartnershipAckTemplate(baseData);
  assert.ok(tpl.html.includes('Wholesale'), 'html should include typeLabel');
  assert.ok(tpl.text.includes('Wholesale'), 'text should include typeLabel');
});

test('ack template sets expectation of response within 2 business days', () => {
  const tpl = generatePartnershipAckTemplate(baseData);
  assert.ok(
    /2 business days/i.test(tpl.html),
    'html should mention "2 business days"',
  );
  assert.ok(
    /2 business days/i.test(tpl.text),
    'text should mention "2 business days"',
  );
});

test('ack template returns non-empty text', () => {
  const tpl = generatePartnershipAckTemplate(baseData);
  assert.ok(tpl.text.trim().length > 0, 'text should be non-empty');
});

test('ack template for institutional inquiry uses correct typeLabel', () => {
  const tpl = generatePartnershipAckTemplate({
    ...baseData,
    inquiryType: 'institutional',
    typeLabel: 'Institutional',
  });
  assert.ok(tpl.html.includes('Institutional'), 'html should include Institutional typeLabel');
  assert.ok(tpl.text.includes('Institutional'), 'text should include Institutional typeLabel');
});
