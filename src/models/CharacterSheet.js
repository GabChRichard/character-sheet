// src/models/CharacterSheet.js
import { Profile } from './Profile.js';

export class CharacterSheet {
  constructor(data) {
    this.code = data.code;
    this.profile = new Profile(data.profile || {});
    this.badges = data.badges || {};
    this.level = data.level || { score: 0, title: "Aspirant" };
  }
}
