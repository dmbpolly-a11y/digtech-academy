const fs = require('fs');
let content = fs.readFileSync('src/components/EnrollmentForm.tsx', 'utf8');

const classesToRemove = [
  'bg-blue-50/70', 'bg-blue-50', 'bg-blue-100', 'bg-red-50', 'bg-emerald-50',
  'bg-\\[#1A4095\\]', 'bg-\\[#28C0F4\\]', 'bg-gray-100', 'bg-gray-50', 'bg-white', 'bg-white/15', 'bg-white/30', 'bg-black/60',
  'text-white', 'text-\\[#1A4095\\]', 'text-blue-100', 'text-blue-700', 'text-red-700', 'text-emerald-600', 'text-emerald-700', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-400',
  'border', 'border-t', 'border-blue-100', 'border-blue-200', 'border-red-200', 'border-emerald-200', 'border-gray-200', 'border-gray-300', 'border-transparent',
  'shadow-lg', 'shadow-md', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-\\[0_0_15px_rgba\\(40,192,244,0.5\\)\\]',
  'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full', 'rounded-lg', 'rounded-md',
  'ring-2', 'ring-blue-100', 'ring-emerald-100', 'focus:ring-2', 'focus:ring-blue-100',
  'focus:border-\\[#1A4095\\]',
  'bg-gradient-to-r', 'from-\\[#1A4095\\]', 'via-\\[#0f2660\\]', 'to-\\[#28C0F4\\]',
  'hover:bg-blue-50', 'hover:bg-white/30', 'hover:border-blue-400', 'hover:shadow-md', 'hover:bg-\\[#153275\\]', 'hover:bg-gray-50'
];

classesToRemove.forEach(cls => {
  const regex = new RegExp('\\b' + cls.replace(/[\/]/g, '\\/') + '\\b', 'g');
  content = content.replace(regex, '');
});

// For complex bracket classes that \b doesn't catch well
content = content.replace(/bg-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/text-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/from-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/via-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/to-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/focus:border-\[#[0-9A-Fa-f]+\]/g, '');
content = content.replace(/shadow-\[[^\]]+\]/g, '');

content = content.replace(/style=\{\{[^}]*\}\}/g, '');

content = content.replace(/className=\"\s+/g, 'className=\"');
content = content.replace(/\s+\"/g, '\"');
content = content.replace(/className=\"\"/g, '');

fs.writeFileSync('src/components/EnrollmentForm.tsx', content);
console.log('Styles stripped successfully.');
