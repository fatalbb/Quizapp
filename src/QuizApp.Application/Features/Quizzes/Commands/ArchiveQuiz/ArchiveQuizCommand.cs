using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.ArchiveQuiz;

public record ArchiveQuizCommand(Guid Id) : IRequest;

public class ArchiveQuizCommandHandler : IRequestHandler<ArchiveQuizCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ArchiveQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(ArchiveQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        quiz.Status = QuizStatus.Archived;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
