using MediatR;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Questions.Commands.DeleteQuestionMedia;

public record DeleteQuestionMediaCommand(Guid QuestionId, Guid MediaId) : IRequest;

public class DeleteQuestionMediaCommandHandler : IRequestHandler<DeleteQuestionMediaCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public DeleteQuestionMediaCommandHandler(IApplicationDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task Handle(DeleteQuestionMediaCommand request, CancellationToken cancellationToken)
    {
        var media = await _context.QuestionMedia.FindAsync([request.MediaId], cancellationToken)
            ?? throw new NotFoundException(nameof(QuestionMedia), request.MediaId);

        if (media.QuestionId != request.QuestionId)
            throw new NotFoundException(nameof(QuestionMedia), request.MediaId);

        await _fileStorageService.DeleteFileAsync(media.FilePath, cancellationToken);
        _context.QuestionMedia.Remove(media);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
