using FluentValidation;
using MediatR;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;

public class CreateQuizCommand : IRequest<Guid>
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public int PassingScorePercentage { get; set; } = 50;
    public List<QuizCategoryDto> Categories { get; set; } = [];

    // Exam mode
    public QuizMode Mode { get; set; } = QuizMode.Learning;
    public int MaxAttempts { get; set; } // 0 = unlimited
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

public class QuizCategoryDto
{
    public Guid CategoryId { get; set; }
    public int QuestionCount { get; set; }
    public int EasyPercentage { get; set; } = 34;
    public int MediumPercentage { get; set; } = 33;
    public int HardPercentage { get; set; } = 33;

    // Question type distribution
    public int MultipleChoicePercentage { get; set; } = 25;
    public int SingleChoicePercentage { get; set; } = 25;
    public int TrueFalsePercentage { get; set; } = 25;
    public int InputPercentage { get; set; } = 25;
}

public class CreateQuizCommandValidator : AbstractValidator<CreateQuizCommand>
{
    public CreateQuizCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.TimeLimitMinutes).GreaterThan(0);
        RuleFor(x => x.PassingScorePercentage).InclusiveBetween(1, 100);
        RuleFor(x => x.Categories).NotEmpty();
        RuleFor(x => x.MaxAttempts).GreaterThanOrEqualTo(0);

        // Exam-specific validation
        When(x => x.Mode == QuizMode.Exam, () =>
        {
            RuleFor(x => x.StartMode).NotNull().WithMessage("Start mode required for exams.");

            When(x => x.StartMode == ExamStartMode.Scheduled, () =>
            {
                RuleFor(x => x.ScheduledStartAt).NotNull().WithMessage("Scheduled start time required.");
                RuleFor(x => x.ScheduledEndAt).NotNull().WithMessage("Scheduled end time required.");
                RuleFor(x => x).Must(x =>
                    !x.ScheduledStartAt.HasValue || !x.ScheduledEndAt.HasValue ||
                    x.ScheduledEndAt > x.ScheduledStartAt
                ).WithMessage("End time must be after start time.");
            });

            When(x => x.StartMode == ExamStartMode.Manual, () =>
            {
                RuleFor(x => x.JoinWindowMinutes).GreaterThan(0);
            });
        });
    }
}

public class CreateQuizCommandHandler : IRequestHandler<CreateQuizCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercentage = request.PassingScorePercentage,
            CreatedById = _currentUserService.UserId!,
            Mode = request.Mode,
            MaxAttempts = request.MaxAttempts,
            StartMode = request.Mode == QuizMode.Exam ? request.StartMode : null,
            ScheduledStartAt = request.Mode == QuizMode.Exam && request.StartMode == ExamStartMode.Scheduled
                ? request.ScheduledStartAt : null,
            ScheduledEndAt = request.Mode == QuizMode.Exam && request.StartMode == ExamStartMode.Scheduled
                ? request.ScheduledEndAt : null,
            JoinWindowMinutes = request.JoinWindowMinutes,
            AllowFeedback = request.AllowFeedback,
            AllowReevaluation = request.AllowReevaluation,
            AutoReevaluationQuota = request.AutoReevaluationQuota,
            MaxReevaluationsPerStudent = Math.Max(0, request.MaxReevaluationsPerStudent),
            QuizCategories = request.Categories.Select(c => new QuizCategory
            {
                CategoryId = c.CategoryId,
                QuestionCount = c.QuestionCount,
                EasyPercentage = c.EasyPercentage,
                MediumPercentage = c.MediumPercentage,
                HardPercentage = c.HardPercentage,
                MultipleChoicePercentage = c.MultipleChoicePercentage,
                SingleChoicePercentage = c.SingleChoicePercentage,
                TrueFalsePercentage = c.TrueFalsePercentage,
                InputPercentage = c.InputPercentage
            }).ToList()
        };

        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync(cancellationToken);

        return quiz.Id;
    }
}
