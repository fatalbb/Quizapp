using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.PublishQuiz;

public record PublishQuizCommand(Guid Id) : IRequest;

public class PublishQuizCommandHandler : IRequestHandler<PublishQuizCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public PublishQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(PublishQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        // Exam quizzes must be validated (previewed) before publishing
        if (quiz.Mode == QuizMode.Exam && !quiz.IsValidated)
            throw new InvalidOperationException("Exam quizzes must be previewed and validated before publishing.");

        quiz.Status = QuizStatus.Published;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
