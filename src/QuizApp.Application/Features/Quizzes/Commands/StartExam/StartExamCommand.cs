using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.StartExam;

public record StartExamCommand(Guid Id) : IRequest<DateTime>;

public class StartExamCommandHandler : IRequestHandler<StartExamCommand, DateTime>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public StartExamCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<DateTime> Handle(StartExamCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (quiz.Mode != QuizMode.Exam)
            throw new InvalidOperationException("Only exam quizzes can be started manually.");

        if (quiz.StartMode != ExamStartMode.Manual)
            throw new InvalidOperationException("This exam is scheduled, not manual.");

        if (quiz.Status != QuizStatus.Published)
            throw new InvalidOperationException("Quiz must be published before starting.");

        quiz.ManualStartedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return quiz.ManualStartedAt.Value;
    }
}
