using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Quizzes.Commands.ValidateQuiz;

public record ValidateQuizCommand(Guid Id) : IRequest;

public class ValidateQuizCommandHandler : IRequestHandler<ValidateQuizCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ValidateQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(ValidateQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = await _context.Quizzes.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (_currentUserService.Role != UserRole.Admin && quiz.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        if (quiz.Mode != QuizMode.Exam)
            throw new InvalidOperationException("Only exam quizzes need to be validated.");

        quiz.IsValidated = true;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
