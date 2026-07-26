// src/components/student/ProfileCard.js
import { db } from '../../services/SupabaseService.js';

function renderAvatarInto(el, avatarUrl) {
  if (!el) return;
  if (avatarUrl) {
    el.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
  } else {
    el.innerText = "🧙‍♂️";
  }
}

export function renderProfileCard(profile, isOwner = true, onUpdate = null) {
  const aliasEl = document.getElementById('student-alias');
  const objectifEl = document.getElementById('student-objectif');
  const tagsEl = document.getElementById('student-interests');
  const avatarEl = document.getElementById('student-avatar');
  const editProfileBtn = document.getElementById('edit-profile-btn');

  if (aliasEl) aliasEl.innerText = profile.alias || "Étudiant Anonyme";
  if (objectifEl) objectifEl.innerText = profile.objectif ? `"${profile.objectif}"` : "Aucun objectif";
  renderAvatarInto(avatarEl, profile.avatarUrl);

  // Masquer le bouton d'édition si on n'est pas le propriétaire
  if (editProfileBtn) {
    if (isOwner) editProfileBtn.classList.remove('hidden');
    else editProfileBtn.classList.add('hidden');
  }

  if (tagsEl) {
    tagsEl.innerHTML = '';
    const interests = profile.interests || [];
    if (interests.length === 0) {
      tagsEl.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">Aucun intérêt</span>';
    } else {
      interests.forEach(interest => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.innerText = interest;
        tagsEl.appendChild(span);
      });
    }
  }

  // Si c'est le propriétaire, configurer le formulaire d'édition (profil + avatar)
  if (isOwner && onUpdate) {
    // Préparation de la modale d'édition
    editProfileBtn?.addEventListener('click', () => {
      const modal = document.getElementById('profile-modal');
      const aliasInput = document.getElementById('prof-alias');
      const aliasError = document.getElementById('prof-alias-error');
      const objectifInput = document.getElementById('prof-objectif');
      const interestList = document.getElementById('edit-interests-list');
      const avatarPreview = document.getElementById('prof-avatar-preview');
      const avatarInput = document.getElementById('prof-avatar-input');

      if (aliasInput) aliasInput.value = profile.alias || '';
      if (aliasError) aliasError.classList.add('hidden');
      if (objectifInput) objectifInput.value = profile.objectif || '';
      renderAvatarInto(avatarPreview, profile.avatarUrl);

      // Upload immédiat de la photo dès sa sélection
      if (avatarInput) {
        avatarInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            const code = document.getElementById('student-code-input').value;
            const publicUrl = await db.uploadAvatar(code, file);
            profile.avatarUrl = publicUrl;
            await db.updateStudentProfile({ avatarUrl: publicUrl });
            renderAvatarInto(avatarPreview, publicUrl);
            renderAvatarInto(avatarEl, publicUrl);
          } catch (err) {
            alert("Erreur lors de l'upload de l'avatar: " + err.message);
          }
        };
      }

      const renderEditInterests = () => {
        if (!interestList) return;
        interestList.innerHTML = '';
        (profile.interests || []).forEach((interest, idx) => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.innerHTML = `${interest} <span class="remove-interest" data-idx="${idx}" style="cursor:pointer; margin-left:5px; font-weight:bold;">&times;</span>`;
          interestList.appendChild(span);
        });

        // Event listener pour supprimer un tag d'intérêt
        interestList.querySelectorAll('.remove-interest').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            profile.interests = (profile.interests || []).filter((_, i) => i !== idx);
            renderEditInterests();
          });
        });
      };

      renderEditInterests();

      // Ajouter intérêt
      const addInterestBtn = document.getElementById('add-interest-btn');
      const newInterestInput = document.getElementById('new-interest-input');
      const handleAddInterest = () => {
        const value = newInterestInput.value.trim();
        if (!value || (profile.interests || []).includes(value)) return;
        if ((profile.interests || []).length >= 6) {
          alert("Vous ne pouvez ajouter que 6 intérêts maximum.");
          return;
        }
        profile.interests = [...(profile.interests || []), value];
        newInterestInput.value = '';
        renderEditInterests();
      };

      addInterestBtn?.addEventListener('click', handleAddInterest);
      newInterestInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddInterest();
        }
      });

      const profileForm = document.getElementById('profile-form');
      if (profileForm) {
        profileForm.onsubmit = async (e) => {
          e.preventDefault();
          const newAlias = document.getElementById('prof-alias').value.trim();
          const newObjectif = document.getElementById('prof-objectif').value.trim();
          if (aliasError) aliasError.classList.add('hidden');
          try {
            await db.updateStudentProfile({
              alias: newAlias,
              objectif: newObjectif,
              interests: profile.interests || []
            });
            modal.classList.add('hidden');
            if (onUpdate) onUpdate();
          } catch (err) {
            if (err.code === '23505' && aliasError) {
              aliasError.innerText = "Cet alias est déjà pris, choisis-en un autre.";
              aliasError.classList.remove('hidden');
            } else {
              alert("Erreur lors de la mise à jour: " + err.message);
            }
          }
        };
      }

      document.querySelector('.close-profile-modal')?.addEventListener('click', () => {
        modal.classList.add('hidden');
      });

      modal?.classList.remove('hidden');
    });
  }
}
