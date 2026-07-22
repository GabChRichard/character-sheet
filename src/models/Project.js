// src/models/Project.js

export class Project {
  constructor(data) {
    this.id = data.id || null;
    this.student_code = data.student_code;
    this.name = data.name;
    this.description = data.description || "";
    this.course = data.course || "";
    this.skills = data.skills || []; // array of skill IDs
    this.skill_weight = data.skill_weight || this.skills.length || 1;
    this.semester = data.semester || "";
    this.link = data.link || "";
  }
}
