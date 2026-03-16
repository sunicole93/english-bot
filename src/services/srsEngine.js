export function calculateNextReview(currentInterval, isCorrect) {
  let newInterval;

  if (isCorrect) {
    newInterval = Math.min(Math.round(currentInterval * 2.5), 60);
  } else {
    newInterval = 1;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);
  const nextReviewDate = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD

  return { newInterval, nextReviewDate };
}
