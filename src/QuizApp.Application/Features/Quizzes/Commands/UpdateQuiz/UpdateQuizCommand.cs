using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.UpdateQuiz;

public class UpdateQuizCommand : IRequest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public int PassingScorePercentage { get; set; }
    public List<QuizCategoryDto> Categories { get; set; } = [];

    // Exam mode
    public QuizMode Mode { get; set; } = QuizMode.Learning;
    public int MaxAttempts { get; set; }
    public ExamStartMode? StartMode { get; set; }
    public DateTime? ScheduledStartAt { get; set; }
    public DateTime? ScheduledEndAt { get; set; }
    public int JoinWindowMinutes { get; set; } = 5;

    // Feedback / Re-evaluation
    public bool AllowFeedback { get; set; } = true;
    public bool AllowReevaluation { get; set; }
    public bool AutoReevaluationQuota { get; set; } = true;
    public int MaxReevaluationsPerStudent { get; set; } = 1;
}

public class UpdateQuizCommandHandler : IRequestHandler<UpdateQuizCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (quiz.Status != QuizStatus.Draft)
            throw new InvalidOperationException("Can only update quizzes in Draft status.");

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.TimeLimitMinutes = request.TimeLimitMinutes;
        quiz.PassingScorePercentage = request.PassingScorePercentage;

        // Exam mode
        quiz.Mode = request.Mode;
        quiz.MaxAttempts = request.MaxAttempts;
        quiz.StartMode = request.Mode == QuizMode.Exam ? request.StartMode : null;
        quiz.ScheduledStartAt = request.Mode == QuizMode.Exam && request.StartMode == ExamStartMode.Scheduled
            ? request.ScheduledStartAt : null;
        quiz.ScheduledEndAt = request.Mode == QuizMode.Exam && request.StartMode == ExamStartMode.Scheduled
            ? request.ScheduledEndAt : null;
        quiz.JoinWindowMinutes = request.JoinWindowMinutes;
        quiz.AllowFeedback = request.AllowFeedback;
        quiz.AllowReevaluation = request.AllowReevaluation;
        quiz.AutoReevaluationQuota = request.AutoReevaluationQuota;
        quiz.MaxReevaluationsPerStudent = Math.Max(0, request.MaxReevaluationsPerStudent);

        // Reset validation if quiz was edited
        quiz.IsValidated = false;
        quiz.ManualStartedAt = null;

        _context.QuizCategories.RemoveRange(quiz.QuizCategories);
        quiz.QuizCategories = request.Categories.Select(c => new QuizCategory
        {
            QuizId = quiz.Id,
            CategoryId = c.CategoryId,
            QuestionCount = c.QuestionCount,
            EasyPercentage = c.EasyPercentage,
            MediumPercentage = c.MediumPercentage,
            HardPercentage = c.HardPercentage,
            MultipleChoicePercentage = c.MultipleChoicePercentage,
            SingleChoicePercentage = c.SingleChoicePercentage,
            TrueFalsePercentage = c.TrueFalsePercentage,
            InputPercentage = c.InputPercentage
        }).ToList();

        await _context.SaveChangesAsync(cancellationToken);
    }
}
