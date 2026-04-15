using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.SubmitQuizAttempt;

public class SubmitQuizAttemptCommand : IRequest<QuizAttemptResultDto>
{
    public Guid AttemptId { get; set; }
    public List<SubmitAnswerDto> Answers { get; set; } = [];
}

public class SubmitAnswerDto
{
    public Guid QuestionId { get; set; }
    public Guid? SelectedAnswerId { get; set; }
    public List<Guid>? SelectedAnswerIds { get; set; } // for multiple choice
    public string? InputText { get; set; }
}

public class QuizAttemptResultDto
{
    public Guid AttemptId { get; set; }
    public double Score { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public bool Passed { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<QuestionResultDto> QuestionResults { get; set; } = [];
}

public class QuestionResultDto
{
    public Guid QuestionId { get; set; }
    public string? QuestionText { get; set; }
    public bool IsCorrect { get; set; }
    public string? AiEvaluationNotes { get; set; }
}

public class SubmitQuizAttemptCommandHandler : IRequestHandler<SubmitQuizAttemptCommand, QuizAttemptResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IOllamaService _ollamaService;

    public SubmitQuizAttemptCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IOllamaService ollamaService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _ollamaService = ollamaService;
    }

    public async Task<QuizAttemptResultDto> Handle(SubmitQuizAttemptCommand request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.AttemptAnswers)
            .Include(a => a.Quiz)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        if (attempt.StudentId != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (attempt.Status != QuizAttemptStatus.InProgress)
            throw new InvalidOperationException("This attempt has already been completed.");

        // Check time limit
        var isTimedOut = DateTime.UtcNow > attempt.StartedAt.AddMinutes(attempt.TimeLimitMinutes);
        attempt.Status = isTimedOut ? QuizAttemptStatus.TimedOut : QuizAttemptStatus.Completed;
        attempt.CompletedAt = DateTime.UtcNow;

        var correctCount = 0;
        var questionResults = new List<QuestionResultDto>();

        foreach (var attemptAnswer in attempt.AttemptAnswers)
        {
            var submitted = request.Answers.FirstOrDefault(a => a.QuestionId == attemptAnswer.QuestionId);
            if (submitted == null) continue;

            // Load the question with correct answers (bypass global filter for safety)
            var question = await _context.Questions
                .IgnoreQueryFilters()
                .Include(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == attemptAnswer.QuestionId, cancellationToken);

            if (question == null) continue;

            attemptAnswer.AnsweredAt = DateTime.UtcNow;
            bool isCorrect;

            switch (question.QuestionType)
            {
                case QuestionType.SingleChoice:
                case QuestionType.TrueFalse:
                    attemptAnswer.SelectedAnswerId = submitted.SelectedAnswerId;
                    var correctAnswer = question.Answers.FirstOrDefault(a => a.IsCorrect);
                    isCorrect = correctAnswer != null && submitted.SelectedAnswerId == correctAnswer.Id;
                    break;

                case QuestionType.MultipleChoice:
                    // For multiple choice, check all selected answers
                    var correctIds = question.Answers.Where(a => a.IsCorrect).Select(a => a.Id).ToHashSet();
                    var selectedIds = submitted.SelectedAnswerIds?.ToHashSet() ?? [];
                    isCorrect = correctIds.SetEquals(selectedIds);
                    attemptAnswer.SelectedAnswerId = submitted.SelectedAnswerIds?.FirstOrDefault();
                    attemptAnswer.InputText = submitted.SelectedAnswerIds != null
                        ? string.Join(",", submitted.SelectedAnswerIds)
                        : null;
                    break;

                case QuestionType.Input:
                    attemptAnswer.InputText = submitted.InputText;
                    var expectedAnswer = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
                    var evaluation = await _ollamaService.EvaluateAnswerAsync(
                        question.Text ?? "",
                        expectedAnswer,
                        submitted.InputText ?? "",
                        cancellationToken);
                    isCorrect = evaluation.IsCorrect;
                    attemptAnswer.AiEvaluationNotes = evaluation.Explanation;
                    break;

                default:
                    isCorrect = false;
                    break;
            }

            attemptAnswer.IsCorrect = isCorrect;
            if (isCorrect) correctCount++;

            questionResults.Add(new QuestionResultDto
            {
                QuestionId = attemptAnswer.QuestionId,
                QuestionText = question.Text,
                IsCorrect = isCorrect,
                AiEvaluationNotes = attemptAnswer.AiEvaluationNotes
            });
        }

        attempt.CorrectAnswers = correctCount;
        attempt.Score = attempt.TotalQuestions > 0
            ? Math.Round((double)correctCount / attempt.TotalQuestions * 100, 2)
            : 0;

        await _context.SaveChangesAsync(cancellationToken);

        return new QuizAttemptResultDto
        {
            AttemptId = attempt.Id,
            Score = attempt.Score.Value,
            CorrectAnswers = correctCount,
            TotalQuestions = attempt.TotalQuestions,
            Passed = attempt.Score >= attempt.Quiz.PassingScorePercentage,
            Status = attempt.Status.ToString(),
            QuestionResults = questionResults
        };
    }
}
