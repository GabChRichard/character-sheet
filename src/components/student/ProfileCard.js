// src/components/student/ProfileCard.js
import { db } from '../../services/SupabaseService.js';

export function renderProfileCard(profile, isOwner = true, onUpdate = null) {
  const aliasEl = document.getElementById('student-alias');
  const bioEl = document.getElementById('student-bio');
  const tagsEl = document.getElementById('student-interests');
  const avatarEl = document.getElementById('student-avatar');
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const avatarUploadInput = document.getElementById('avatar-upload');
  const avatarOverlay = document.querySelector('.avatar-edit-overlay');

  if (aliasEl) aliasEl.innerText = profile.alias || "Étudiant Anonyme";
  if (bioEl) bioEl.innerText = profile.bio ? `"${profile.bio}"` : "Aucune bio";
  
  if (avatarEl) {
    if (profile.avatarUrl) {
      avatarEl.innerHTML = `<img src="${profile.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
    } else {
      avatarEl.innerText = "🧙‍♂️";
    }
  }

  // Masquer les boutons d'édition si on n'est pas le propriétaire
  if (editProfileBtn) {
    if (isOwner) editProfileBtn.classList.remove('hidden');
    else editProfileBtn.classList.add('hidden');
  }
  if (avatarOverlay) {
    if (isOwner) avatarOverlay.style.display = 'flex';
    else avatarOverlay.style.display = 'none';
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

  // Si c'est le propriétaire, configurer les formulaires d'édition
  if (isOwner && onUpdate) {
    // Gestion de l'upload de photo de profil
    avatarUploadInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const code = document.getElementById('student-code-input').value;
        const publicUrl = await db.uploadAvatar(code, file);
        await db.updateStudentProfile({ avatarUrl: publicUrl });
        if (onUpdate) onUpdate();
      } catch (err) {
        alert("Erreur lors de l'upload de l'avatar: " + err.message);
      }
    });

    // Préparation de la modale d'édition
    editProfileBtn?.addEventListener('click', () => {
      const modal = document.getElementById('profile-modal');
      const aliasInput = document.getElementById('prof-alias');
      const bioInput = document.getElementById('prof-bio');
      const interestList = document.getElementById('edit-interests-list');

      if (aliasInput) aliasInput.value = profile.alias || '';
      if (bioInput) bioInput.value = profile.bio || '';
      
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
        if (value && !(profile.interests || []).includes(value)) {
          profile.interests = [...(profile.interests || []), value];
          newInterestInput.value = '';
          renderEditInterests();
        }
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
          const newBio = document.getElementById('prof-bio').value.trim();
          try {
            await db.updateStudentProfile({
              alias: newAlias,
              bio: newBio,
              interests: profile.interests || []
            });
            modal.classList.add('hidden');
            if (onUpdate) onUpdate();
          } catch (err) {
            alert("Erreur lors de la mise à jour: " + err.message);
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
