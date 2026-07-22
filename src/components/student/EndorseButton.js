// src/components/student/EndorseButton.js
import { EndorsementService } from '../../services/EndorsementService.js';

export function renderEndorseButton(container, skillId, studentCode, visitorCode, onEndorsed) {
  if (!container || !visitorCode || studentCode === visitorCode) return;

  const btn = document.createElement('button');
  btn.className = 'btn small secondary endorse-btn';
  btn.innerHTML = '👍 Endosser';
  
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const result = await EndorsementService.endorseSkill(visitorCode, studentCode, skillId);
    if (result) {
      btn.innerHTML = '✅ Endossé';
      btn.classList.add('success');
      if (onEndorsed) onEndorsed();
    } else {
      btn.disabled = false;
      alert("Erreur lors de l'endossement.");
    }
  });

  container.appendChild(btn);
}
