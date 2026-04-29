using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Helpers;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.QuizAttempts.Commands.SubmitQuizAttempt;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.QuizAttempts.Queries.GetAttemptResult;

public record GetAttemptResultQuery(Guid AttemptId) : IRequest<QuizAttemptResultDto>;

public class GetAttemptResultQueryHandler : IRequestHandler<GetAttemptResultQuery, QuizAttemptResultDto>
{
    private readonly IApplicationDbContext _context;

    public GetAttemptResultQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<QuizAttemptResultDto> Handle(GetAttemptResultQuery request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.AttemptAnswers)
                .ThenInclude(aa => aa.Question)
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        return new QuizAttemptResultDto
        {
            AttemptId = attempt.Id,
            Score = attempt.Score ?? 0,
            CorrectAnswers = attempt.CorrectAnswers,
            TotalQuestions = attempt.TotalQuestions,
            Passed = (attempt.Score ?? 0) >= attempt.Quiz.PassingScorePercentage,
            Status = attempt.Status.ToString(),
            IsGrading = attempt.IsGrading,
            AllowFeedback = attempt.Quiz.AllowFeedback,
            AllowReevaluation = attempt.Quiz.AllowReevaluation,
            MaxReevaluationsPerStudent = ReevaluationQuotaHelper.GetEffectiveMax(attempt.Quiz, attempt),
            ReevaluationsUsed = attempt.AttemptAnswers.Sum(aa => aa.ReevaluationCount),
            QuestionResults = attempt.AttemptAnswers.Select(aa => new QuestionResultDto
            {
                QuestionId = aa.QuestionId,
                QuestionText = aa.Question.Text,
                IsCorrect = aa.IsCorrect, // null while pending grading
                AiEvaluationNotes = aa.AiEvaluationNotes
            }).ToList()
        };
    }
}
