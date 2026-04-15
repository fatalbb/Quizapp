using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Questions.Commands.CreateQuestion;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.UpdateQuestion;

public class UpdateQuestionCommand : IRequest
{
    public Guid Id { get; set; }
    public string? Text { get; set; }
    public QuestionType QuestionType { get; set; }
    public QuestionContentType ContentType { get; set; }
    public DifficultyLevel DifficultyLevel { get; set; }
    public Guid CategoryId { get; set; }
    public List<CreateAnswerDto> Answers { get; set; } = [];
}

public class UpdateQuestionCommandHandler : IRequestHandler<UpdateQuestionCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateQuestionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateQuestionCommand request, CancellationToken cancellationToken)
    {
        var question = await _context.Questions
            .Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.Id);

        if (_currentUserService.Role != UserRole.Admin && question.CreatedById != _currentUserService.UserId)
            throw new ForbiddenAccessException();

        question.Text = request.Text;
        question.QuestionType = request.QuestionType;
        question.ContentType = request.ContentType;
        question.DifficultyLevel = request.DifficultyLevel;
        question.CategoryId = request.CategoryId;

        // Delete old answers first
        _context.Answers.RemoveRange(question.Answers);
        await _context.SaveChangesAsync(cancellationToken);

        // Add new answers
        var newAnswers = request.Answers.Select((a, i) => new Answer
        {
            Id = Guid.NewGuid(),
            Text = a.Text,
            IsCorrect = a.IsCorrect,
            OrderIndex = i,
            QuestionId = question.Id
        }).ToList();

        foreach (var answer in newAnswers)
            _context.Answers.Add(answer);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
