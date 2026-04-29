using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.QuizAttempts.Commands.GetQuestionFeedback;

public record GetQuestionFeedbackCommand(Guid AttemptId, Guid QuestionId) : IRequest<QuestionFeedbackDto>;

public class QuestionFeedbackDto
{
    public string Explanation { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
}

public class GetQuestionFeedbackCommandHandler : IRequestHandler<GetQuestionFeedbackCommand, QuestionFeedbackDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IOllamaService _ollamaService;

    public GetQuestionFeedbackCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IOllamaService ollamaService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _ollamaService = ollamaService;
    }

    public async Task<QuestionFeedbackDto> Handle(GetQuestionFeedbackCommand request, CancellationToken cancellationToken)
    {
        var attempt = await _context.QuizAttempts
            .Include(a => a.Quiz)
            .Include(a => a.AttemptAnswers)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuizAttempt), request.AttemptId);

        // Authorization
        var role = _currentUserService.Role;
        if (role == UserRole.Student)
        {
            if (attempt.StudentId != _currentUserService.UserId)
                throw new ForbiddenAccessException();
            if (!attempt.Quiz.AllowFeedback)
                throw new InvalidOperationException("Feedback is disabled for this quiz.");
        }
        else if (role == UserRole.Teacher)
        {
            if (attempt.Quiz.CreatedById != _currentUserService.UserId)
                throw new ForbiddenAccessException();
        }
        // Admin: unrestricted

        var attemptAnswer = attempt.AttemptAnswers.FirstOrDefault(aa => aa.QuestionId == request.QuestionId)
            ?? throw new NotFoundException(nameof(AttemptAnswer), request.QuestionId);

        var question = await _context.Questions
            .IgnoreQueryFilters()
            .Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        // Build correct answer text
        string correctAnswerText;
        string studentAnswerText;

        switch (question.QuestionType)
        {
            case QuestionType.SingleChoice:
            case QuestionType.TrueFalse:
                correctAnswerText = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
                studentAnswerText = attemptAnswer.SelectedAnswerId.HasValue
                    ? question.Answers.FirstOrDefault(a => a.Id == attemptAnswer.SelectedAnswerId.Value)?.Text ?? "(no answer)"
                    : "(no answer)";
                break;

            case QuestionType.MultipleChoice:
                var correctAnswers = question.Answers.Where(a => a.IsCorrect).Select(a => a.Text).ToList();
                correctAnswerText = string.Join("; ", correctAnswers);
                var selectedIds = (attemptAnswer.InputText ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => Guid.TryParse(s.Trim(), out var g) ? g : Guid.Empty)
                    .Where(g => g != Guid.Empty)
                    .ToHashSet();
                var selectedTexts = question.Answers.Where(a => selectedIds.Contains(a.Id)).Select(a => a.Text).ToList();
                studentAnswerText = selectedTexts.Count == 0 ? "(no answer)" : string.Join("; ", selectedTexts);
                break;

            case QuestionType.Input:
                correctAnswerText = question.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? "";
                studentAnswerText = string.IsNullOrWhiteSpace(attemptAnswer.InputText) ? "(no answer)" : attemptAnswer.InputText;
                break;

            default:
                correctAnswerText = "";
                studentAnswerText = "";
                break;
        }

        // Use cached feedback if available
        var explanation = attemptAnswer.FeedbackExplanation;
        if (string.IsNullOrEmpty(explanation))
        {
            explanation = await _ollamaService.GenerateFeedbackAsync(
                question.Text ?? "",
                question.QuestionType.ToString(),
                correctAnswerText,
                studentAnswerText,
                attemptAnswer.IsCorrect == true,
                cancellationToken);

            attemptAnswer.FeedbackExplanation = explanation;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new QuestionFeedbackDto
        {
            Explanation = explanation,
            CorrectAnswer = correctAnswerText
        };
    }
}
