using QuizApp.Domain.Entities;

namespace QuizApp.Application.Common.Helpers;

public static class ReevaluationQuotaHelper
{
    /// <summary>
    /// Computes the effective re-evaluation quota for a student attempt.
    /// - If quiz.AutoReevaluationQuota is true: equal to the number of wrong answers in the attempt
    ///   (clamped between 0 and TotalQuestions).
    /// - Otherwise: returns the teacher-specified MaxReevaluationsPerStudent.
    /// </summary>
    public static int GetEffectiveMax(Quiz quiz, QuizAttempt attempt)
    {
        if (quiz.AutoReevaluationQuota)
        {
            // Count wrong answers (IsCorrect == false). Don't count nulls (still grading).
            var wrongCount = attempt.AttemptAnswers.Count(aa => aa.IsCorrect == false);
            return Math.Clamp(wrongCount, 0, attempt.TotalQuestions);
        }

        return Math.Max(0, quiz.MaxReevaluationsPerStudent);
    }
}
