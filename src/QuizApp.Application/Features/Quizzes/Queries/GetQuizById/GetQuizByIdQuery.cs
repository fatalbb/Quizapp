using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Quizzes.Queries.GetQuizById;

public record GetQuizByIdQuery(Guid Id) : IRequest<QuizDetailDto>;

public class QuizDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int PassingScorePercentage { get; set; }
    public List<QuizCategoryDetailDto> Categories { get; set; } = [];

    // Exam mode fields
    public string Mode { get; set; } = "Learning";
    public bool IsValidated { get; set; }
    public int MaxAttempts { get; set; }
    public string? StartMode { get; set; }
    public DateTime? ScheduledStartAt { get; set; }
    public DateTime? ScheduledEndAt { get; set; }
    public DateTime? ManualStartedAt { get; set; }
    public int JoinWindowMinutes { get; set; }
    public bool AllowFeedback { get; set; }
    public bool AllowReevaluation { get; set; }
    public bool AutoReevaluationQuota { get; set; }
    public int MaxReevaluationsPerStudent { get; set; }
}

public class QuizCategoryDetailDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public int EasyPercentage { get; set; }
    public int MediumPercentage { get; set; }
    public int HardPercentage { get; set; }
    public int MultipleChoicePercentage { get; set; }
    public int SingleChoicePercentage { get; set; }
    public int TrueFalsePercentage { get; set; }
    public int InputPercentage { get; set; }
}

public class GetQuizByIdQueryHandler : IRequestHandler<GetQuizByIdQuery, QuizDetailDto>
{
    private readonly IApplicationDbContext _context;

    public GetQuizByIdQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<QuizDetailDto> Handle(GetQuizByIdQuery request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.QuizCategories)
                .ThenInclude(qc => qc.Category)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        return new QuizDetailDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            Status = quiz.Status.ToString(),
            PassingScorePercentage = quiz.PassingScorePercentage,
            Categories = quiz.QuizCategories.Select(qc => new QuizCategoryDetailDto
            {
                CategoryId = qc.CategoryId,
                CategoryName = qc.Category.Name,
                QuestionCount = qc.QuestionCount,
                EasyPercentage = qc.EasyPercentage,
                MediumPercentage = qc.MediumPercentage,
                HardPercentage = qc.HardPercentage,
                MultipleChoicePercentage = qc.MultipleChoicePercentage,
                SingleChoicePercentage = qc.SingleChoicePercentage,
                TrueFalsePercentage = qc.TrueFalsePercentage,
                InputPercentage = qc.InputPercentage
            }).ToList(),
            Mode = quiz.Mode.ToString(),
            IsValidated = quiz.IsValidated,
            MaxAttempts = quiz.MaxAttempts,
            StartMode = quiz.StartMode?.ToString(),
            ScheduledStartAt = quiz.ScheduledStartAt,
            ScheduledEndAt = quiz.ScheduledEndAt,
            ManualStartedAt = quiz.ManualStartedAt,
            JoinWindowMinutes = quiz.JoinWindowMinutes,
            AllowFeedback = quiz.AllowFeedback,
            AllowReevaluation = quiz.AllowReevaluation,
            AutoReevaluationQuota = quiz.AutoReevaluationQuota,
            MaxReevaluationsPerStudent = quiz.MaxReevaluationsPerStudent
        };
    }
}
