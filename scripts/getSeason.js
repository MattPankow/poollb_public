/**
 * Returns the current year.
 * @returns {number} year
 */
export function getYear() {
  const now = new Date();
  return now.getFullYear();
}

/**
 * Returns the current semester, 1 if Spring, 2 if Fall.
 * @returns {number} semester
 */
export function getSemester() {
  const now = new Date();
  return now.getMonth() < 6 ? 1 : 2;
}

