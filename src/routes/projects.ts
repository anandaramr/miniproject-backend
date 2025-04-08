import { Router } from "express"
import { authorize } from "../utils"
import { AuthResponse } from "../types"
import Pool from '../database'

const router = Router()

router.get('/', authorize, (req, res: AuthResponse) => {
    Pool.from('Projects').select('project_id, project_name, state, Collaborators(project_id, user_id, is_owner)').eq('Collaborators.user_id', res.user.userId)
    .then(async ({ data, error }) => {
        if (error) {
            res.status(500).json({ error: error.message })
            return;
        }

        const projectsWorkedByUser = data.filter(item => item["Collaborators"].length)

        res.status(201).json(projectsWorkedByUser.map(item => ({ 
            projectId: item.project_id, 
            projectName: item.project_name, 
            isOwner: item.Collaborators[0].is_owner,
            state: item.state
        })))
    })
})

router.post('/new', authorize, (req, res: AuthResponse) => {
    const name = req.body.projectName

    if (!name) {
        res.status(400).json("Missing field: \"projectName\"")
        return;
    }

    Pool.from('Projects').insert({ project_name: name }).select()
    .then(async ({ data, error }) => {
        if (error) {
            res.status(500).json({ error: error.message })
            return;
        }

        const project = data[0]
        Pool.from('Collaborators').insert({ project_id: data[0].project_id, user_id: res.user.userId, is_owner: true })
        .then(({ error }) => {
            if (error) {
                res.status(500).json({ error: error.message })
                return;
            }

            const { project_id, project_name, state } = project
            res.status(201).json({ projectId: project_id, projectName: project_name, state })
        })
    })
})

router.patch('/state', authorize, (req, res: AuthResponse) => {
    const state = req.body.state
    const projectId = req.body.projectId

    if (!projectId) {
        res.status(400).json("Missing field: \"projectId\"")
        return;
    }

    if (!state) {
        res.status(400).json("Missing field: \"state\"")
        return;
    }

    projectCollaboratorAction(res, projectId, () => {
        Pool.from('Projects').update({ state }).eq('project_id', projectId).select()
        .then(async ({ error }) => {
            if (error) {
                res.status(500).json({ error: error.message })
                return;
            }
    
            res.status(201).json({ message: "Updated state succesfully" })
        })
    })
})

router.get('/collaborator/:id', authorize, async (req, res: AuthResponse) => {
    const projectId = req.params.id
    Pool.from('Collaborators').select().eq('project_id', projectId)
    .then(async ({ data, error }) => {
        const users = data?.map(item => {
            const { project_id, ...users } = item
            return users
        }) || []

        let found = false
        for (let user of users) {
            if (user.user_id == res.user.userId) {
                found = true
                break;
            }
        }

        if (!found) {
            res.status(401).json({ error: "Unnauthorized action" })
            return;
        }

        const result = await Promise.all(users.map(async (user) => {
            return await Pool.from('Users').select('username').eq('user_id', user.user_id)
            .then(({ data, error}) => {
                if (error) {
                    res.status(500).json({ error: error.message })
                    return;
                }

                const newUser = { ...user, username: data[0].username }
                return newUser
            })
        }))

        res.status(200).json(result)
    })
})

router.post('/collaborator', authorize, async (req, res: AuthResponse) => {
    const projectId = req.body.projectId
    const username = req.body.username
    
    if (!projectId) {
        res.status(400).json("Missing field: \"projectId\"")
        return;
    }
    
    if (!username) {
        res.status(400).json("Missing field: \"username\"")
        return;
    }

    let user: any;
    await Pool.from('Users').select().eq('username', username)
    .then(({ data, error}) => {
        if (error) {
            res.status(500).json({ error: error.message })
            return;
        }

        user = data[0]
    })

    if (!user) {
        res.status(400).json({ error: "User does not exist" })
        return;
    }

    const userId = user.user_id
    projectOwnerAction(res, projectId, () => {
        Pool.from('Collaborators').insert({ user_id: userId, project_id: projectId }).select()
        .then(({ error }) => {
            if (error) {
                res.status(500).json({ error: error.message })
                return;
            }
                
            res.status(201).json({ message: "Added collaborator succesfully!" })
        })}
    )

})

router.post('/collaborator/remove', authorize, async (req, res: AuthResponse) => {
    const projectId = req.body.projectId
    const username = req.body.username
    
    if (!projectId) {
        res.status(400).json("Missing field: \"projectId\"")
        return;
    }
    
    if (!username) {
        res.status(400).json("Missing field: \"username\"")
        return;
    }

    let user: any;
    await Pool.from('Users').select().eq('username', username)
    .then(({ data, error}) => {
        if (error) {
            console.log(error)
            return;
        }

        user = data[0]
    })

    if (!user) {
        res.status(400).json({ error: "User does not exist" })
        return;
    }

    const userId = user.user_id
    projectOwnerAction(res, projectId, () => {
        Pool.from('Collaborators').delete().eq('project_id', projectId).eq('user_id', userId).select()
        .then(({ error }) => {
            if (error) {
                res.status(500).json({ error: error.message })
                return;
            }

            res.status(201).json({ message: "Removed collaborator succesfully!" })
        })}
    )
    
})

router.delete('/remove/:id', authorize, (req, res: AuthResponse) => {
    const id = req.params.id

    if (!id) {
        res.status(400).json("Missing parameter: project_id")
        return;
    }

    projectOwnerAction(res, id, () =>
        Pool.from('Projects').delete().eq('project_id', id).select()
        .then(async ({ data, error }) => {
            if (error) {
                res.status(500).json({ error: error.message })
                return;
            }
    
            res.status(201).json({ message: "Deleted project succesfully!", project_details: data })
        })
    )

})

function projectOwnerAction(res: AuthResponse, projectId: string, action: Function) {
    Pool.from('Collaborators').select('user_id').eq('project_id', projectId).eq('is_owner', true)
    .then(async ({ data: users, error }) => {
        checkProjectAuth(res, users, error, action)
    })
}

function projectCollaboratorAction(res: AuthResponse, projectId: string, action: Function) {
    Pool.from('Collaborators').select('user_id').eq('project_id', projectId)
    .then(async ({ data: users, error }) => {
        checkProjectAuth(res, users, error, action)
    })
}

async function checkProjectAuth(res: AuthResponse, users: any, error: any, action: Function) {
    if (error) {
        res.status(500).json({ error: error.message })
        return;
    }

    if (!users.length) {
        res.status(404).json({ error: "Couldn't find project" })
        return;
    }

    let found = false
    for (let user of users) {
        if (user.user_id == res.user.userId) {
            found = true
            break;
        }
    }

    if (!found) {
        res.status(403).json({ error: "Unauthorized action" })
        return;
    }


    action()
} 

export default router