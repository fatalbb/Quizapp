using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.ReuseQuiz;

public record ReuseQuizCommand(Guid Id) : IRequest<Guid>;

public class ReuseQuizCommandHandler : IRequestHandler<ReuseQuizCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ReuseQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(ReuseQuizCommand request, CancellationToken cancellationToken)
    {
        var source = await _context.Quizzes
            .Include(q => q.QuizCategories)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && source.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        // Clone the quiz with these rules:
        // - ALWAYS reset: Id (new), Status (Draft), CreatedAt (now), Title (suffix "(Copy)")
        // - For Exam mode, ALSO reset: IsValidated, ManualStartedAt, ScheduledStartAt, ScheduledEndAt
        //   (the old scheduled times are in the past; teacher must re-validate and re-schedule)
        // - KEEP: TimeLimitMinutes, PassingScorePercentage, Mode, MaxAttempts, StartMode,
        //         JoinWindowMinutes, Description, Categories with difficulty distribution

        var newQuiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = source.Title + " (Copy)",
            Description = source.Description,
            TimeLimitMinutes = source.TimeLimitMinutes,
            PassingScorePercentage = source.PassingScorePercentage,
            Status = QuizStatus.Draft,
            CreatedById = _currentUserService.UserId!,
            CreatedAt = DateTime.UtcNow,

            // Mode-related fields preserved
            Mode = source.Mode,
            MaxAttempts = source.MaxAttempts,
            StartMode = source.Mode == QuizMode.Exam ? source.StartMode : null,
            JoinWindowMinutes = source.JoinWindowMinutes,

            // Exam-specific resets
            IsValidated = false,
            ManualStartedAt = null,
            ScheduledStartAt = null, // teacher must set new dates
            ScheduledEndAt = null,

            // Clone the category configuration
            QuizCategories = source.QuizCategories.Select(qc => new QuizCategory
            {
                CategoryId = qc.CategoryId,
                QuestionCount = qc.QuestionCount,
                EasyPercentage = qc.EasyPercentage,
                MediumPercentage = qc.MediumPercentage,
                HardPercentage = qc.HardPercentage
            }).ToList()
        };

        _context.Quizzes.Add(newQuiz);
        await _context.SaveChangesAsync(cancellationToken);

        return newQuiz.Id;
    }
}
