using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizApp.Domain.Entities;

namespace QuizApp.Infrastructure.Persistence.Configurations;

public class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.Property(q => q.Text).HasMaxLength(2000);
        builder.Property(q => q.QuestionType).IsRequired();
        builder.Property(q => q.ContentType).IsRequired();
        builder.Property(q => q.DifficultyLevel).IsRequired();

        builder.HasQueryFilter(q => q.IsActive);

        builder.HasOne(q => q.Category)
            .WithMany(c => c.Questions)
            .HasForeignKey(q => q.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(q => q.CreatedBy)
            .WithMany(u => u.CreatedQuestions)
            .HasForeignKey(q => q.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(q => new { q.CategoryId, q.IsActive });
    }
}
