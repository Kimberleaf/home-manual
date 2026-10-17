// Each person's character, drawn standing tall beside their Standing Items on
// the Calendar. Original drawings, all on the same 120 x 220 canvas with the
// same soft outline so they read as one set. Keyed by the household roster's
// stored names.
window.HOUSE_MANUAL_CHARACTERS = (() => {
  const ink = '#2b2b2b';
  const line = `stroke="${ink}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const thin = `stroke="${ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  const shadow = '<ellipse cx="60" cy="211" rx="42" ry="6" fill="#000" opacity=".12"/>';
  const eye = (x, y, r = 3.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ink}"/><circle cx="${x + 1.1}" cy="${y - 1.2}" r="${r * 0.35}" fill="#fff"/>`;
  const svg = (label, body) => `<svg viewBox="0 0 120 220" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${shadow}${body}</svg>`;

  // Kim: a friendly witch holding her broom upright.
  const witch = svg("Kim's character: a friendly witch", `
    <rect x="93" y="40" width="6" height="150" rx="3" fill="#8a5a2b" ${thin}/>
    <path d="M85 188 Q96 178 107 188 L113 209 Q96 214 79 209 Z" fill="#eac35c" ${thin}/>
    <path d="M88 194 L86 207 M96 192 L96 209 M104 194 L106 207" stroke="#b98d2c" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="87" y="182" width="18" height="7" rx="2" fill="#7d3c98" ${thin}/>
    <rect x="42" y="182" width="9" height="20" fill="#2e2e2e"/><rect x="42" y="186" width="9" height="4" fill="#9b59b6"/><rect x="42" y="194" width="9" height="4" fill="#9b59b6"/>
    <rect x="60" y="182" width="9" height="20" fill="#2e2e2e"/><rect x="60" y="186" width="9" height="4" fill="#9b59b6"/><rect x="60" y="194" width="9" height="4" fill="#9b59b6"/>
    <path d="M40 200 L53 200 L53 207 L34 207 Q34 201 40 200 Z" fill="#1f1f1f" ${thin}/>
    <path d="M58 200 L71 200 Q77 201 77 207 L58 207 Z" fill="#1f1f1f" ${thin}/>
    <path d="M28 112 Q34 104 42 108" stroke="${ink}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M28 112 Q34 104 42 108" stroke="#6b3fa0" stroke-width="7.5" stroke-linecap="round" fill="none"/>
    <path d="M22 98 Q24 106 28 112" stroke="${ink}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M22 98 Q24 106 28 112" stroke="#6b3fa0" stroke-width="7.5" stroke-linecap="round" fill="none"/>
    <circle cx="21" cy="95" r="6" fill="#ffd8b5" ${thin}/>
    <path d="M38 110 Q55 100 72 110 L84 186 Q55 194 26 186 Z" fill="#6b3fa0" ${line}/>
    <path d="M47 104 L55 122 L63 104" fill="#f6f1fb" ${thin}/>
    <path d="M31 150 Q55 156 80 150 L81 158 Q55 164 30 158 Z" fill="#f2b632" ${thin}/>
    <rect x="50" y="150" width="11" height="10" rx="2" fill="none" ${thin}/>
    <path d="M70 118 Q84 130 93 126" stroke="${ink}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M70 118 Q84 130 93 126" stroke="#6b3fa0" stroke-width="7.5" stroke-linecap="round" fill="none"/>
    <circle cx="95" cy="125" r="6" fill="#ffd8b5" ${thin}/>
    <path d="M33 80 Q27 104 37 114 Q41 100 40 86 Z" fill="#d2602f" ${thin}/>
    <path d="M77 80 Q83 104 73 114 Q69 100 70 86 Z" fill="#d2602f" ${thin}/>
    <circle cx="55" cy="88" r="22" fill="#ffd8b5" ${line}/>
    <path d="M36 80 Q44 70 55 74 Q66 70 74 80 Q66 76 58 80 Q52 76 44 82 Z" fill="#d2602f"/>
    ${eye(47, 89)}${eye(63, 89)}
    <circle cx="41" cy="97" r="4" fill="#ff9aa2" opacity=".75"/><circle cx="69" cy="97" r="4" fill="#ff9aa2" opacity=".75"/>
    <path d="M49 99 Q55 105 61 99" fill="none" ${thin}/>
    <ellipse cx="55" cy="70" rx="35" ry="7.5" fill="#3b2a4f" ${line}/>
    <path d="M37 68 Q46 46 50 26 Q56 6 78 10 Q66 16 66 30 Q68 50 73 68 Z" fill="#3b2a4f" ${line}/>
    <path d="M39 61 Q55 56 71 61 L72 67 Q55 62 38 67 Z" fill="#f2b632" ${thin}/>
    <path d="M14 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#f2b632"/>
    <path d="M104 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#f2b632"/>`);

  // Oliver: the flag of Japan on a tall pole, held proudly by a round little
  // character standing beside it. The flag itself is drawn plainly: white
  // field, red disc.
  const flag = svg("Oliver's character: a standing Japanese flag", `
    <rect x="93" y="16" width="6" height="190" rx="3" fill="#c9a36a" ${thin}/>
    <circle cx="96" cy="14" r="6" fill="#f2b632" ${thin}/>
    <path d="M93 22 Q78 16 62 22 Q48 27 34 22 L34 66 Q48 71 62 66 Q78 60 93 66 Z" fill="#ffffff" ${line}/>
    <circle cx="63" cy="44" r="12" fill="#bc002d"/>
    <path d="M42 196 L40 206 L31 206 M60 196 L62 206 L71 206" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M51 98 C74 98 82 132 80 160 C78 188 68 199 51 199 C34 199 24 188 22 160 C20 132 28 98 51 98 Z" fill="#f4ede1" ${line}/>
    <path d="M30 120 Q51 112 72 120 L73 128 Q51 120 29 128 Z" fill="#bc002d" opacity=".9"/>
    ${eye(43, 140, 3.8)}${eye(60, 140, 3.8)}
    <circle cx="36" cy="150" r="4" fill="#ff9aa2" opacity=".75"/><circle cx="67" cy="150" r="4" fill="#ff9aa2" opacity=".75"/>
    <path d="M45 151 Q51.5 157 58 151" fill="none" ${thin}/>
    <path d="M24 156 Q12 148 12 132" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <circle cx="12" cy="129" r="4" fill="#f4ede1" ${thin}/>
    <path d="M78 156 Q86 152 92 150" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <circle cx="94" cy="150" r="4.5" fill="#f4ede1" ${thin}/>`);

  // Ephraim: a cheerful scorpion standing upright, claws up, tail curled overhead.
  const claw = `
    <path d="M40 150 Q24 140 21 122" stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M40 150 Q24 140 21 122" stroke="#e08a3c" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M10 112 Q8 94 22 92 Q32 94 30 106 Q24 100 20 104 Q24 110 32 110 Q28 120 16 118 Q10 116 10 112 Z" fill="#e08a3c" ${thin}/>`;
  const scorpion = svg("Ephraim's character: a scorpion standing tall", `
    <path d="M46 196 L38 206 M54 198 L50 208 M66 198 L70 208 M74 196 L82 206" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M60 150 C60 112 90 100 88 62 C87 40 70 30 62 40" fill="none" stroke="${ink}" stroke-width="15" stroke-linecap="round"/>
    <path d="M60 150 C60 112 90 100 88 62 C87 40 70 30 62 40" fill="none" stroke="#e08a3c" stroke-width="10" stroke-linecap="round"/>
    <path d="M80 96 L89 99 M86 74 L95 72 M80 46 L84 38" stroke="#b8642a" stroke-width="2" stroke-linecap="round"/>
    <path d="M63 38 Q52 34 52 46 Q56 44 60 48 Z" fill="#c0392b" ${thin}/>
    <ellipse cx="60" cy="168" rx="24" ry="32" fill="#e08a3c" ${line}/>
    <path d="M42 154 Q60 160 78 154 M40 170 Q60 176 80 170 M42 186 Q60 192 78 186" fill="none" stroke="#b8642a" stroke-width="2"/>
    <ellipse cx="60" cy="172" rx="12" ry="20" fill="#f4c189" opacity=".8"/>
    ${claw}
    <g transform="translate(120 0) scale(-1 1)">${claw}</g>
    <circle cx="60" cy="122" r="21" fill="#e08a3c" ${line}/>
    ${eye(52, 120, 4)}${eye(68, 120, 4)}
    <circle cx="46" cy="130" r="3.6" fill="#ff9aa2" opacity=".7"/><circle cx="74" cy="130" r="3.6" fill="#ff9aa2" opacity=".7"/>
    <path d="M53 131 Q60 137 67 131" fill="none" ${thin}/>
    <path d="M52 102 Q48 92 42 90 M68 102 Q72 92 78 90" fill="none" ${thin}/>
    <circle cx="42" cy="90" r="2.5" fill="${ink}"/><circle cx="78" cy="90" r="2.5" fill="${ink}"/>`);

  // Brighton: a round little bluebird standing tall on two legs.
  const bird = svg("Brighton's character: a bluebird standing tall", `
    <path d="M50 178 L48 204 M70 178 L72 204" stroke="#e8902c" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M40 206 L48 203 L56 206 M64 206 L72 203 L80 206" fill="none" stroke="#e8902c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M88 150 Q108 160 104 176 Q94 170 84 166 Z" fill="#2f6db5" ${thin}/>
    <ellipse cx="60" cy="128" rx="34" ry="52" fill="#4a90d9" ${line}/>
    <ellipse cx="60" cy="146" rx="22" ry="32" fill="#f8d9b4"/>
    <path d="M28 120 Q16 140 30 162 Q38 150 40 132 Z" fill="#2f6db5" ${thin}/>
    <path d="M92 120 Q104 140 90 162 Q82 150 80 132 Z" fill="#2f6db5" ${thin}/>
    <path d="M54 72 Q56 58 64 62 Q60 66 62 74 Z" fill="#2f6db5" ${thin}/>
    ${eye(49, 104, 4)}${eye(71, 104, 4)}
    <circle cx="42" cy="114" r="4" fill="#ff9aa2" opacity=".7"/><circle cx="78" cy="114" r="4" fill="#ff9aa2" opacity=".7"/>
    <path d="M53 112 L67 112 L60 122 Z" fill="#f2b632" ${thin}/>`);

  // Michael: a skateboard standing up on its tail, grinning, wheels out.
  const skateboard = svg("Michael's character: a skateboard standing tall", `
    <rect x="26" y="36" width="10" height="16" rx="4" fill="#9aa5ad" ${thin}/>
    <rect x="84" y="36" width="10" height="16" rx="4" fill="#9aa5ad" ${thin}/>
    <rect x="26" y="168" width="10" height="16" rx="4" fill="#9aa5ad" ${thin}/>
    <rect x="84" y="168" width="10" height="16" rx="4" fill="#9aa5ad" ${thin}/>
    <circle cx="22" cy="44" r="8" fill="#f2b632" ${thin}/><circle cx="98" cy="44" r="8" fill="#f2b632" ${thin}/>
    <circle cx="22" cy="176" r="8" fill="#f2b632" ${thin}/><circle cx="98" cy="176" r="8" fill="#f2b632" ${thin}/>
    <path d="M36 30 Q36 14 60 14 Q84 14 84 30 L84 192 Q84 206 60 206 Q36 206 36 192 Z" fill="#24575a" ${line}/>
    <path d="M38 56 L82 46 L82 64 L38 74 Z" fill="#e8743b"/>
    <path d="M38 150 L82 140 L82 158 L38 168 Z" fill="#e8743b"/>
    <circle cx="60" cy="110" r="22" fill="#fbfaf7" ${thin}/>
    ${eye(52, 105, 4)}${eye(68, 105, 4)}
    <path d="M50 116 Q60 126 70 116 Z" fill="#c0392b" ${thin}/>
    <circle cx="45" cy="114" r="3.4" fill="#ff9aa2" opacity=".8"/><circle cx="75" cy="114" r="3.4" fill="#ff9aa2" opacity=".8"/>
    <path d="M36 96 Q22 88 16 72" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M84 96 Q100 92 106 104" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="15" cy="69" r="4" fill="#fbfaf7" ${thin}/><circle cx="107" cy="106" r="4" fill="#fbfaf7" ${thin}/>`);

  return {
    Kimberly: { name: 'Witch', svg: witch },
    Oliver: { name: 'Japanese flag', svg: flag },
    Ephraim: { name: 'Scorpion', svg: scorpion },
    Brighton: { name: 'Bluebird', svg: bird },
    Michael: { name: 'Skateboard', svg: skateboard }
  };
})();
