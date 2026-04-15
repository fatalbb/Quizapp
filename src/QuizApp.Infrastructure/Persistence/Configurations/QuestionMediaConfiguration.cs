using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuizApp.Domain.Entities;

namespace QuizApp.Infrastructure.Persistence.Configurations;

public class QuestionMediaConfiguration : IEntityTypeConfiguration<QuestionMedia>
{
    public void Configure(EntityTypeBuilder<QuestionMedia> builder)
    {
        builder.Property(m => m.FileName).HasMaxLength(255).IsRequired();
        builder.Property(m => m.StoredFileName).HasMaxLength(255).IsRequired();
        builder.Property(m => m.ContentMimeType).HasMaxLength(100).IsRequired();
        builder.Property(m => m.FilePath).HasMaxLength(500).IsRequired();

        builder.HasOne(m => m.Question)
            .WithMany(q => q.Media)
            .HasForeignKey(m => m.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
