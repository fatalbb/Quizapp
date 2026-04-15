using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.DeleteQuestion;

public record DeleteQuestionCommand(Guid Id) : IRequest;

public class DeleteQuestionCommandHandler : IRequestHandler<DeleteQuestionCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteQuestionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteQuestionCommand request, CancellationToken cancellationToken)
    {
        var question = await _context.Questions.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.Id);

        if (_currentUserService.Role != UserRole.Admin && question.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        question.IsActive = false; // soft delete
        await _context.SaveChangesAsync(cancellationToken);
    }
}
