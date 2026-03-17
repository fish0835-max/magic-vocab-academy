import { WordEntry } from '../../types'

interface SpellbookCardProps {
  word: WordEntry
}

export function SpellbookCard({ word }: SpellbookCardProps) {
  return (
    <div className="bg-purple-900/50 border border-purple-600 rounded-lg p-3 text-center">
      <img
        src={word.imageUrl}
        alt={word.word}
        className="w-16 h-16 object-cover rounded-md mx-auto mb-2"
        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📚</text></svg>' }}
      />
      <p className="text-amber-300 font-bold">{word.word}</p>
      <p className="text-purple-300 text-sm">{word.translation}</p>
    </div>
  )
}
