const knex = require('../database/knex')
const AppError = require('../utils/AppError')

class NotesController {
  async create(req, res) {
    const { title, description, rating, tags } = req.body
    const user_id = req.user.id

    if (rating < 1 || rating > 5) {
      throw new AppError('A nota do filme deve estar entre 1 e 5')
    }

    const [note_id] = await knex('moviesNotes').insert({
      title,
      description,
      rating,
      user_id
    })

    const tagsInsert = tags.map(name => {
      return {
        note_id,
        user_id,
        name
      }
    })

    await knex('moviesTags').insert(tagsInsert)

    return res.json()
  }

  async show(req, res) {
    const { id } = req.params

    const note = await knex('moviesNotes').where({ id }).first()
    const tags = await knex('moviesTags').where({ note_id: id }).orderBy('name')

    return res.json({
      ...note,
      tags,
    })
  }

  async delete(req, res) {
    const { id } = req.params

    await knex('moviesNotes').where({ id }).delete()

    return res.json()
  }

  async index(req, res) {
    const { title, tags } = req.query
    const user_id = req.user.id

    let notes

    if (tags) {
      const filterTags = tags.split(',').map(tag => tag.trim())

      notes = await knex('moviesTags')
        .select(['moviesNotes.id', 'moviesNotes.title', 'moviesNotes.user_id'])
        .where('moviesNotes.user_id', user_id)
        .whereLike('moviesNotes.title', `%${title}%`)
        .whereIn('name', filterTags)
        .innerJoin('moviesNotes', 'moviesNotes.id', 'moviesTags.note_id')
        .orderBy('moviesNotes.title')
    } else {
      notes = await knex('moviesNotes')
        .where({ user_id })
        .whereLike('title', `%${title}%`)
        .orderBy('title')
    }

    const userTags = await knex('moviesTags').where({ user_id })
    const notesWithTags = notes.map(note => {
      const noteTags = userTags.filter(tag => tag.note_id === note.id)

      return {
        ...note,
        tags: noteTags
      }
    })

    return res.json(notesWithTags)
  }
}

module.exports = NotesController