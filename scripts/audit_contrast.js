function getLuminance(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return +(ratio.toFixed(2));
}

const optimizedThemes = {
  'Matcha Calm (Optimized)': {
    bgMain: '#F4F8F4',
    bgSurface: '#FFFFFF',
    bgSubtle: '#EDF5EE',
    border: '#D0DEC0',
    primary: '#38704B',
    primaryFg: '#FFFFFF',
    textMain: '#1A2E20',
    textMuted: '#495E4F',
    textSubtle: '#5F7565',
    accent: '#B85D3B'
  },
  'Strawberry Milk (Optimized)': {
    bgMain: '#FAF5F6',
    bgSurface: '#FFFFFF',
    bgSubtle: '#F4EAEE',
    border: '#E2CDD4',
    primary: '#B04761',
    primaryFg: '#FFFFFF',
    textMain: '#261419',
    textMuted: '#5C444D',
    textSubtle: '#755B65',
    accent: '#3E6F56'
  },
  'Strawberry Dark (Optimized)': {
    bgMain: '#181316',
    bgSurface: '#221B20',
    bgSubtle: '#2C2329',
    border: '#45373F',
    primary: '#F092AA',
    primaryFg: '#181316',
    textMain: '#FBF5F7',
    textMuted: '#CBBAC1',
    textSubtle: '#9E8B93',
    accent: '#8FD4AE'
  },
  'Cozy Night (Optimized)': {
    bgMain: '#14171F',
    bgSurface: '#1E2330',
    bgSubtle: '#272E3E',
    border: '#3D465C',
    primary: '#85C7B0',
    primaryFg: '#0D1410',
    textMain: '#F4F7FB',
    textMuted: '#B2BFD4',
    textSubtle: '#8C9BB2',
    accent: '#F7B079'
  }
};

for (const [name, colors] of Object.entries(optimizedThemes)) {
  console.log(`--- ${name} ---`);
  console.log(`textMain on Surface: ${getContrast(colors.textMain, colors.bgSurface)}:1`);
  console.log(`textMain on Main:    ${getContrast(colors.textMain, colors.bgMain)}:1`);
  console.log(`textMuted on Surface: ${getContrast(colors.textMuted, colors.bgSurface)}:1`);
  console.log(`textMuted on Subtle:  ${getContrast(colors.textMuted, colors.bgSubtle)}:1`);
  console.log(`textSubtle on Surface: ${getContrast(colors.textSubtle, colors.bgSurface)}:1`);
  console.log(`primary on Surface:   ${getContrast(colors.primary, colors.bgSurface)}:1`);
  console.log(`primaryFg on Primary: ${getContrast(colors.primaryFg, colors.primary)}:1`);
  console.log('');
}
