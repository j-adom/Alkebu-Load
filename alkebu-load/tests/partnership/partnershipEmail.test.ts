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

// ─── XSS / HTML injection regression ────────────────────────────────────────

test('staff template escapes HTML in organizationName and message', () => {
  const tpl = generatePartnershipStaffTemplate({
    ...baseData,
    organizationName: '<script>alert(1)</script>',
    message: '<img src=x onerror=alert(2)>',
  });
  assert.ok(
    tpl.html.includes('&lt;script&gt;'),
    'organizationName script tag should be escaped in HTML',
  );
  assert.ok(
    !tpl.html.includes('<script>'),
    'literal <script> must NOT appear in staff HTML output',
  );
  assert.ok(
    tpl.html.includes('&lt;img'),
    'message img tag should be escaped in HTML',
  );
  assert.ok(
    !tpl.html.includes('<img'),
    'literal <img must NOT appear in staff HTML output',
  );
});

test('staff template escapes HTML in email, phone, sourcePath, and detail rows', () => {
  const tpl = generatePartnershipStaffTemplate({
    ...baseData,
    email: 'x@x.com',
    phone: '<b>evil</b>',
    sourcePath: '/<script>path</script>',
    details: { '<b>key</b>': '<i>val</i>' },
  });
  assert.ok(!tpl.html.includes('<b>evil</b>'), 'phone must not inject raw HTML');
  assert.ok(tpl.html.includes('&lt;b&gt;evil&lt;/b&gt;'), 'phone must be escaped');
  assert.ok(!tpl.html.includes('<script>path'), 'sourcePath must not inject raw HTML');
  assert.ok(!tpl.html.includes('<b>key</b>'), 'detail key must not inject raw HTML');
  assert.ok(!tpl.html.includes('<i>val</i>'), 'detail value must not inject raw HTML');
});

test('staff template renders valid email as mailto link and invalid as plain text', () => {
  const validTpl = generatePartnershipStaffTemplate({ ...baseData, email: 'ada@example.com' });
  assert.ok(
    validTpl.html.includes('href="mailto:ada%40example.com"') ||
    validTpl.html.includes('href="mailto:ada@example.com"'),
    'valid email should render as mailto link',
  );

  const invalidTpl = generatePartnershipStaffTemplate({ ...baseData, email: 'not-an-email' });
  // The store's own BRAND.email appears as a legitimate mailto in the footer;
  // only assert that the user-supplied invalid value does NOT become a link.
  assert.ok(
    !invalidTpl.html.includes('href="mailto:not-an-email"'),
    'invalid email must NOT render as a mailto href',
  );
  assert.ok(
    invalidTpl.html.includes('not-an-email'),
    'invalid email should still appear as escaped plain text',
  );
});

test('ack template escapes name in greeting', () => {
  const tpl = generatePartnershipAckTemplate({
    ...baseData,
    name: '<script>alert(3)</script>',
  });
  assert.ok(
    tpl.html.includes('&lt;script&gt;'),
    'name script tag should be escaped in ack HTML',
  );
  assert.ok(
    !tpl.html.includes('<script>'),
    'literal <script> must NOT appear in ack HTML output',
  );
});
