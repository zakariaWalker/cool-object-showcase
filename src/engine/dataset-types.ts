// ===== Imadrassa JSON Dataset Types =====

export interface ImadrassaDataset {
  _meta: {
    grade_id: string;
    subject_id: string;
    curriculum_id: string;
    page_id: string;
    sidemenuel_id: string;
    stream: string | null;
    label: string;
    scraped_at: string;
    scraper_version: string;
    total_chapters: number;
    total_exercises: number;
  };
  chapters: ImadrassaChapter[];
}

export interface ImadrassaChapter {
  chapter: string;
  lesson_id: string;
  exercises: ImadrassaExercise[];
}

export interface ImadrassaExercise {
  url: string;
  title: string;
  statement: string;
  questions: string[];
  answers: string[];
}
