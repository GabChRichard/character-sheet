// src/models/Profile.js

export class Profile {
  constructor(data) {
    this.alias = data.alias || "Étudiant Anonyme";
    this.avatarSeed = data.avatarSeed || "default";
    this.year = data.year || 1;
    this.interests = data.interests || [];
    this.bio = data.bio || "";
    this.theme = data.theme || "parchment";
  }
}
