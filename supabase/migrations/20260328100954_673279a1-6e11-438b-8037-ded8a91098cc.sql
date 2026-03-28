DELETE FROM kb_exercises
WHERE id NOT IN (
  SELECT DISTINCT ON (text) id
  FROM kb_exercises
  ORDER BY text, created_at ASC
);